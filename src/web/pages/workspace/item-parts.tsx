import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { RewordMode, RewordResult } from "@custom-types/reword-types";
import { Item, Section } from "@custom-types/vault-types";
import {
  FieldSpec,
  fieldSpecsFor,
  toMonthValue,
} from "@shared/vault/item-fields";
import { EyeToggle } from "@pages/workspace/eye-toggle";
import { DescriptionBullets } from "@pages/workspace/description-bullets";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { batch } from "@store/history/history";
import { createApiClient } from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeJobSelector,
  activeVariantSelector,
  setItemSelection,
} from "@store/jobs/jobs-slice";
import { AiButton } from "@components/ai-button";

/** The free texts the AI can reword (the summary and the descriptions) */
const REWORDABLE = ["description", "text"];

/** Ready-made requests for the wording of one text. "Bullet points" is DescriptionBullets. */
const MODES: { mode: RewordMode; label: string; needsKeywords?: boolean }[] = [
  { mode: "shorten", label: "Shorten" },
  { mode: "rephrase", label: "Rephrase for this job", needsKeywords: true },
  { mode: "longer", label: "Make longer" },
];

function valueOf(spec: FieldSpec, text: string): string {
  return spec.kind === "month" ? toMonthValue(text) : text;
}

interface TextActionsProps {
  item: Item;
  field: string;
  keywords: string[];
}

/** Ready-made wording requests for one text of an item; the result is only shown until the user uses it */
function TextActions({ item, field, keywords }: TextActionsProps): JSX.Element {
  const dispatch = useAppDispatch();
  const api = useMemo(() => createApiClient(), []);
  const variant = useAppSelector(activeVariantSelector);
  const choice = variant.selection[item.id];
  const isReworded = choice?.fieldText?.[field] !== undefined;
  const [busy, setBusy] = useState<RewordMode | null>(null);
  const [error, setError] = useState<string>("");
  const [proposal, setProposal] = useState<RewordResult | null>(null);

  async function ask(mode: RewordMode): Promise<void> {
    setBusy(mode);
    setError("");
    setProposal(null);
    try {
      setProposal(
        await api.rewordText({
          itemId: item.id,
          field,
          mode,
          requirements: keywords,
        })
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Rewording failed.");
    } finally {
      setBusy(null);
    }
  }

  function setText(text: string | undefined): void {
    const next = { ...choice?.fieldText };
    if (text === undefined) {
      delete next[field];
    } else {
      next[field] = text;
    }
    dispatch(
      batch("Reword text", [
        setItemSelection({
          jobId: variant.id,
          itemId: item.id,
          change: {
            fieldText: Object.keys(next).length > 0 ? next : undefined,
          },
        }),
      ])
    );
    setProposal(null);
  }

  return (
    <Box sx={{ display: "grid", gap: 0.75, mt: 0.5 }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {MODES.map(({ mode, label, needsKeywords }) => (
          <AiButton
            key={mode}
            size="small"
            variant="outlined"
            disabled={
              busy !== null || (needsKeywords === true && keywords.length === 0)
            }
            title={
              needsKeywords && keywords.length === 0
                ? "Analyse the job description first"
                : undefined
            }
            startIcon={
              busy === mode ? (
                <CircularProgress size={14} color="inherit" />
              ) : undefined
            }
            onClick={() => void ask(mode)}
          >
            {busy === mode ? "Working…" : label}
          </AiButton>
        ))}
        <Button
          size="small"
          variant="outlined"
          disabled={!isReworded || busy !== null}
          sx={{ ml: "auto" }}
          onClick={() => setText(undefined)}
        >
          Use the vault text
        </Button>
      </Box>
      {isReworded && !proposal && (
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          Worded for this job only. The vault keeps your own text.
        </Typography>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {proposal && (
        <Box
          sx={{
            display: "grid",
            gap: 0.75,
            p: 1,
            border: `1px solid ${WORKSPACE_COLORS.border}`,
            borderRadius: 1,
            bgcolor: WORKSPACE_COLORS.panel,
          }}
        >
          <Typography sx={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
            {proposal.text}
          </Typography>
          {proposal.flags.length > 0 && (
            <Alert severity="warning">
              Not in your text: {proposal.flags.join(", ")}. Check it before
              using it.
            </Alert>
          )}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={() => setText(proposal.text)}
            >
              Use this text
            </Button>
            <Button size="small" onClick={() => setProposal(null)}>
              Discard
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

interface Props {
  section: Section;
  item: Item;
  isDimmed: boolean;
}

/** Which parts of an item (with a value) the job can show or hide, in the order of the vault form */
export function itemPartsOf(section: Section, item: Item): FieldSpec[] {
  return fieldSpecsFor(section.type).filter(
    (spec) => (item.fields[spec.key] ?? "").trim() !== ""
  );
}

/**
 * The parts of one entry (title, dissertation, description ...), like the skills of a
 * group: tick what this job shows. The first part is the entry's title and always shows. The
 * free texts also get ready-made wording requests (shorten, rephrase for this job, make longer,
 * bullet points). Only the job changes; the vault keeps everything.
 */
export function ItemParts({ section, item, isDimmed }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const analysis = useAppSelector(activeJobSelector).analysis;
  const keywords = useMemo(
    () =>
      analysis
        ? [
            ...new Set([
              ...analysis.mustHave,
              ...analysis.niceToHave,
              ...analysis.keywords,
            ]),
          ]
        : [],
    [analysis]
  );
  const choice = variant.selection[item.id];
  const hidden = choice?.hiddenFields ?? [];
  const specs = itemPartsOf(section, item);
  const hasDates = specs.some((spec) => spec.key === "startDate");
  const primaryKey = fieldSpecsFor(section.type)[0]?.key;

  /** Start and end are one part ("Dates"): showing only one of them has no use */
  function setShown(key: string, isShown: boolean): void {
    const keys = key === "startDate" ? ["startDate", "endDate"] : [key];
    const next = isShown
      ? hidden.filter((k) => !keys.includes(k))
      : [...new Set([...hidden, ...keys])];
    dispatch(
      setItemSelection({
        jobId: variant.id,
        itemId: item.id,
        change: { hiddenFields: next.length > 0 ? next : undefined },
      })
    );
  }

  return (
    <>
      {specs
        // the end date is drawn together with the start date
        .filter((spec) => !(hasDates && spec.key === "endDate"))
        .map((spec) => {
          const isPrimary = spec.key === primaryKey;
          const canReword = REWORDABLE.includes(spec.key);
          const isShown = !hidden.includes(spec.key);
          const text = choice?.fieldText?.[spec.key] ?? item.fields[spec.key];
          const isDates = spec.key === "startDate";
          const label = isDates
            ? "Dates"
            : spec.label.replace(/ \(optional\)$/, "");
          return (
            <Box
              key={spec.key}
              sx={{
                display: "grid",
                gridTemplateColumns: "32px minmax(0, 1fr)",
                columnGap: 1,
                alignItems: "start",
                py: 0.75,
                pl: 4.5,
                pr: 2.5,
                borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
                bgcolor: WORKSPACE_COLORS.panel,
                boxShadow: `inset 3px 0 0 ${WORKSPACE_COLORS.accentSoft}`,
              }}
            >
              {isPrimary ? (
                <span />
              ) : (
                <EyeToggle
                  isShown={isShown}
                  label={label}
                  isAccent
                  onChange={(next) => setShown(spec.key, next)}
                />
              )}
              <Box
                sx={{
                  minWidth: 0,
                  color:
                    isShown && !isDimmed
                      ? WORKSPACE_COLORS.text
                      : WORKSPACE_COLORS.muted,
                }}
              >
                <Typography
                  sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted }}
                >
                  {label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 13.5,
                    whiteSpace: canReword ? "pre-wrap" : "normal",
                    overflowWrap: "anywhere",
                  }}
                >
                  {isDates
                    ? `${valueOf(spec, text)} – ${
                        item.fields.endDate
                          ? toMonthValue(item.fields.endDate)
                          : "Present"
                      }`
                    : valueOf(spec, text)}
                </Typography>
                {canReword && isShown && (
                  <TextActions
                    item={item}
                    field={spec.key}
                    keywords={keywords}
                  />
                )}
                {spec.key === "description" && isShown && (
                  <Box sx={{ mt: 1 }}>
                    <DescriptionBullets item={item} />
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
    </>
  );
}
