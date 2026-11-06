import { useEffect, useMemo, useState } from "react";
import { nanoid } from "@reduxjs/toolkit";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { MAX_JOB_AD_LENGTH, TailorResult } from "@custom-types/tailor-types";
import { Tone } from "@custom-types/variant-types";
import { Item, Section, Vault } from "@custom-types/vault-types";
import { activateVariant } from "@hooks/use-sync-active-variant";
import {
  Decisions,
  ItemChange,
  applyProposal,
  defaultDecisions,
  describeItemChange,
} from "@shared/ai/apply-proposal";
import { canAutoAccept } from "@shared/ai/guardrails";
import { getItemLabel, shorten } from "@shared/variant/item-label";
import { ApiError, createApiClient } from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  insertVariant,
} from "@store/variants/variants-slice";
import { setBulletAlt, vaultSelector } from "@store/vault/vault-slice";

/** "show, highlight" or "no change" */
function describeChangeText(change: ItemChange): string {
  if (!change.hasChange) {
    return "no change";
  }
  const parts: string[] = [];
  if (change.wasVisible !== change.isVisible) {
    parts.push(change.isVisible ? "show" : "hide");
  }
  if (change.wasHighlighted !== change.isHighlighted) {
    parts.push(change.isHighlighted ? "highlight" : "remove highlight");
  }
  return parts.join(", ");
}

const TONES: { value: Tone; label: string }[] = [
  { value: "neutral", label: "Neutral" },
  { value: "formal", label: "Formal" },
  { value: "conversational", label: "Conversational" },
];

function findItem(
  vault: Vault,
  itemId: string
): { section: Section; item: Item } | undefined {
  for (const section of vault.sections) {
    const item = section.items.find((i) => i.id === itemId);
    if (item) {
      return { section, item };
    }
  }
  return undefined;
}

/**
 * Tailors the CV to a job advert with AI and lets the user review the result: what would
 * change versus the current variant, what was flagged, what is missing. Nothing is applied until
 * "Create variant", which makes a new variant and leaves the current one alone.
 */
export function AiAssistant(): JSX.Element {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const base = useAppSelector(activeVariantSelector);
  const isSaved = useAppSelector((s) => s.persistence.saved !== null);
  const api = useMemo(() => createApiClient(), []);

  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<"claude" | "ollama">("claude");
  const [jobAd, setJobAd] = useState<string>("");
  const [tone, setTone] = useState<Tone>("neutral");
  const [pageLimit, setPageLimit] = useState<number>(base.pageLimit);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<TailorResult | null>(null);
  const [decisions, setDecisions] = useState<Decisions | null>(null);
  const [created, setCreated] = useState<string>("");

  useEffect(() => {
    api
      .getAiStatus()
      .then((status) => {
        setIsConfigured(status.isConfigured);
        setProvider(status.provider);
      })
      .catch(() => setIsConfigured(false));
  }, [api]);

  async function analyse(): Promise<void> {
    setIsBusy(true);
    setError("");
    setCreated("");
    try {
      const next = await api.tailor({ jobAd, tone });
      setResult(next);
      setDecisions(defaultDecisions(next.proposal));
    } catch (caught) {
      setResult(null);
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The AI request failed."
      );
    } finally {
      setIsBusy(false);
    }
  }

  function create(): void {
    if (!result || !decisions) {
      return;
    }
    const name = `${result.requirements.jobTitle || "Tailored"} (AI)`;
    const { variant, altUpdates } = applyProposal(
      vault,
      base,
      result.proposal,
      decisions,
      { id: nanoid(), name }
    );
    // alternative wordings are added to the CV's own data; the original text is never changed
    for (const update of altUpdates) {
      dispatch(
        setBulletAlt({
          sectionId: update.sectionId,
          itemId: update.itemId,
          bulletId: update.bulletId,
          kind: update.wording,
          text: update.text,
        })
      );
    }
    dispatch(insertVariant({ ...variant, pageLimit }));
    activateVariant(dispatch, { ...variant, pageLimit });
    setCreated(name);
  }

  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        AI assistant
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Paste a job advert. The AI suggests which items to show, what to
        highlight, rewordings and what your CV is missing. It may only select,
        highlight and rephrase what you already wrote. You review everything;
        nothing changes until you create a variant, and your current variant
        stays as it is.
      </Typography>

      {isConfigured === false && (
        <Alert severity="info" sx={{ mb: 2 }}>
          AI is not set up. Either put <code>ANTHROPIC_API_KEY=...</code> in the{" "}
          <code>.env</code> file (paid, Claude), or use a free local model with{" "}
          <code>AI_PROVIDER=ollama</code> (see <code>.env.example</code>), then
          restart the server.
        </Alert>
      )}
      {!isSaved && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The AI works on the saved CV. Save your changes first.
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }}>
        {provider === "ollama"
          ? "Using your local Ollama model: your CV and the advert stay on this computer."
          : "When you press Analyse, your CV (without your name and contact details) and the advert are sent to Anthropic's API."}
      </Alert>

      <TextField
        label="Job advert"
        multiline
        minRows={6}
        fullWidth
        value={jobAd}
        onChange={(event) => setJobAd(event.target.value)}
        helperText={`${jobAd.length} / ${MAX_JOB_AD_LENGTH} characters`}
      />
      <Box display="flex" gap={2} sx={{ mt: 1 }} alignItems="center">
        <TextField
          select
          size="small"
          label="Tone"
          value={tone}
          onChange={(event) => setTone(event.target.value as Tone)}
          sx={{ minWidth: 160 }}
        >
          {TONES.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Page limit"
          value={pageLimit}
          onChange={(event) => setPageLimit(Number(event.target.value))}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value={1}>1 page</MenuItem>
          <MenuItem value={2}>2 pages</MenuItem>
        </TextField>
        <Button
          variant="contained"
          disabled={
            isBusy || !isConfigured || !isSaved || jobAd.trim().length === 0
          }
          onClick={() => void analyse()}
        >
          Analyse
        </Button>
        {isBusy && <CircularProgress size={22} />}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {result && decisions && (
        <Review
          result={result}
          decisions={decisions}
          setDecisions={setDecisions}
          onCreate={create}
        />
      )}
      {created && (
        <Alert severity="success" sx={{ mt: 2 }}>
          Created the variant &quot;{created}&quot; and switched to it. Save to
          keep it.
        </Alert>
      )}
    </>
  );
}

interface ReviewProps {
  result: TailorResult;
  decisions: Decisions;
  setDecisions: (next: Decisions) => void;
  onCreate: () => void;
}

function Review({
  result,
  decisions,
  setDecisions,
  onCreate,
}: ReviewProps): JSX.Element {
  const vault = useAppSelector(vaultSelector);
  const base = useAppSelector(activeVariantSelector);
  const { requirements, proposal, warnings } = result;
  const sorted = [...proposal.items].sort((a, b) => b.relevance - a.relevance);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" fontWeight="bold">
        What the job asks for
      </Typography>
      <Typography variant="body2">
        {requirements.jobTitle}
        {requirements.seniority ? ` (${requirements.seniority})` : ""}
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={0.5} sx={{ my: 1 }}>
        {requirements.mustHave.map((r) => (
          <Chip key={`m-${r}`} size="small" color="primary" label={r} />
        ))}
        {requirements.niceToHave.map((r) => (
          <Chip key={`n-${r}`} size="small" variant="outlined" label={r} />
        ))}
      </Box>

      {proposal.gaps.length > 0 && (
        <Alert severity="warning" sx={{ my: 2 }}>
          <strong>Not shown in your CV:</strong> {proposal.gaps.join("; ")}.
          Nothing was added for these. Only add them if they are true.
        </Alert>
      )}
      {warnings.map((w) => (
        <Alert key={w} severity="warning" sx={{ my: 1 }}>
          {w}
        </Alert>
      ))}

      {proposal.statement && (
        <Box sx={{ my: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Draft personal statement
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: "italic" }}>
            {proposal.statement}
          </Typography>
          {!canAutoAccept(proposal.statementFlags) && (
            <Typography variant="caption" color="error">
              Check: {proposal.statementFlags?.join("; ")}
            </Typography>
          )}
          <Typography variant="caption" display="block">
            Not applied automatically. Copy it into your summary if you like it.
          </Typography>
        </Box>
      )}

      <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 2 }}>
        Proposed changes
      </Typography>
      {sorted.map((entry) => {
        const found = findItem(vault, entry.itemId);
        if (!found) {
          return null;
        }
        const change = describeItemChange(base, entry);
        const bulletProposals = proposal.bullets.filter(
          (b) => b.itemId === entry.itemId
        );
        return (
          <Box key={entry.itemId} sx={{ mt: 1.5 }}>
            <FormControlLabel
              label={
                <span>
                  <strong>{getItemLabel(found.item)}</strong>{" "}
                  <Chip
                    size="small"
                    label={`${Math.round(entry.relevance * 100)}% relevant`}
                  />{" "}
                  {describeChangeText(change)}
                </span>
              }
              control={
                <Checkbox
                  checked={decisions.items[entry.itemId]?.isAccepted ?? false}
                  onChange={(event) =>
                    setDecisions({
                      ...decisions,
                      items: {
                        ...decisions.items,
                        [entry.itemId]: { isAccepted: event.target.checked },
                      },
                    })
                  }
                />
              }
            />
            <Typography variant="caption" display="block" sx={{ pl: 4 }}>
              {entry.reason}
            </Typography>
            {bulletProposals.map((bullet) => {
              const original = found.item.bullets.find(
                (b) => b.id === bullet.bulletId
              );
              const decision = decisions.bullets[bullet.bulletId];
              const isFlagged = !canAutoAccept(bullet.flags);
              return (
                <Box key={bullet.bulletId} sx={{ pl: 5, mt: 0.5 }}>
                  <FormControlLabel
                    label={`${bullet.isIncluded ? "keep" : "hide"}: ${shorten(original?.text ?? "")}`}
                    control={
                      <Checkbox
                        size="small"
                        checked={decision?.isAccepted ?? false}
                        onChange={(event) =>
                          setDecisions({
                            ...decisions,
                            bullets: {
                              ...decisions.bullets,
                              [bullet.bulletId]: {
                                isRewriteAccepted:
                                  decision?.isRewriteAccepted ?? false,
                                isAccepted: event.target.checked,
                              },
                            },
                          })
                        }
                      />
                    }
                  />
                  {bullet.rewrite && (
                    <Box sx={{ pl: 4 }}>
                      <Typography
                        variant="body2"
                        sx={{ textDecoration: "line-through" }}
                      >
                        {original?.text}
                      </Typography>
                      <Typography variant="body2">
                        {bullet.rewrite.text}{" "}
                        <Chip size="small" label={bullet.rewrite.wording} />
                      </Typography>
                      {isFlagged && (
                        <Alert severity="error" sx={{ my: 0.5 }}>
                          Check this one, not accepted automatically:{" "}
                          {bullet.flags?.join("; ")}.
                        </Alert>
                      )}
                      <FormControlLabel
                        label="Use this wording"
                        control={
                          <Checkbox
                            size="small"
                            checked={decision?.isRewriteAccepted ?? false}
                            onChange={(event) =>
                              setDecisions({
                                ...decisions,
                                bullets: {
                                  ...decisions.bullets,
                                  [bullet.bulletId]: {
                                    isAccepted: decision?.isAccepted ?? false,
                                    isRewriteAccepted: event.target.checked,
                                  },
                                },
                              })
                            }
                          />
                        }
                      />
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        );
      })}

      <Button variant="contained" sx={{ mt: 3 }} onClick={onCreate}>
        Create variant from the accepted changes
      </Button>
    </Box>
  );
}
