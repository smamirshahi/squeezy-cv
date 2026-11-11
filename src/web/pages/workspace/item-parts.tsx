import { ReactNode, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
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
import { BulletsProposal } from "@pages/workspace/bullets-proposal";
import { useBulletsAi } from "@pages/workspace/use-bullets-ai";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { batch } from "@store/history/history";
import { createApiClient } from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeJobSelector,
  activeVariantSelector,
  setItemSelection,
} from "@store/jobs/jobs-slice";
import { AiBadge, AiButton, AiIcon } from "@components/ai-button";
import { EmphasiseDialog } from "@pages/workspace/emphasise-dialog";
import {
  AiInfoButton,
  AiSettingsButton,
  jobLabelOf,
} from "@pages/workspace/ai-job-context";

/** The free texts the AI can reword (the summary and the descriptions) */
const REWORDABLE = ["description", "text"];

/** Ready-made requests for the wording of one text. "Bullet points" is DescriptionBullets. */
const MODES: { mode: RewordMode; label: string; needsKeywords?: boolean }[] = [
  { mode: "shorten", label: "Shorten" },
  { mode: "rephrase", label: "Rephrase", needsKeywords: true },
  { mode: "longer", label: "Make longer" },
];

function valueOf(spec: FieldSpec, text: string): string {
  return spec.kind === "month" ? toMonthValue(text) : text;
}

interface TextActionsProps {
  item: Item;
  field: string;
  keywords: string[];
  /** The points the user picked to lean on; they go with every action */
  leanOn: string[];
  onLeanOn: (points: string[]) => void;
  /** The text itself, drawn in the bordered box above the AI strip */
  children: ReactNode;
}

/**
 * The AI strip under one text of an item, in two steps: 1 "Lean on" = pick points from the advert
 * (optional, they stay picked until cleared), 2 "Then" = Shorten, Rephrase, Make longer, or Make
 * bullets (the description only). The result is only shown until the user uses it.
 */
function TextActions({
  item,
  field,
  keywords,
  leanOn,
  onLeanOn,
  children,
}: TextActionsProps): JSX.Element {
  const dispatch = useAppDispatch();
  const api = useMemo(() => createApiClient(), []);
  const variant = useAppSelector(activeVariantSelector);
  const job = useAppSelector(activeJobSelector);
  const choice = variant.selection[item.id];
  const isReworded = choice?.fieldText?.[field] !== undefined;
  const [busy, setBusy] = useState<RewordMode | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [proposal, setProposal] = useState<RewordResult | null>(null);
  const bullets = useBulletsAi(item, leanOn);
  const canMakeBullets = field === "description" && bullets.description !== "";
  const isBusy = busy !== null || bullets.busy !== null;

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
          focus: leanOn.length > 0 ? leanOn : undefined,
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

  const stepLabelSx = {
    fontSize: 12,
    fontWeight: 600,
    color: WORKSPACE_COLORS.aiText,
    minWidth: 62,
  } as const;
  const actionSx = { bgcolor: WORKSPACE_COLORS.panel } as const;

  return (
    <Box sx={{ display: "grid", gap: 0.75, mt: 0.5 }}>
      <Box
        sx={{
          border: `1px solid ${WORKSPACE_COLORS.borderStrong}`,
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: WORKSPACE_COLORS.panel,
        }}
      >
        <Box sx={{ px: 1.5, py: 1.25 }}>{children}</Box>
        <Box
          role="group"
          aria-label={`AI for ${jobLabelOf(job)}`}
          sx={{
            display: "grid",
            gap: 1,
            px: 1.25,
            py: 1,
            bgcolor: WORKSPACE_COLORS.aiSoft,
            borderTop: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                color: WORKSPACE_COLORS.aiText,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <AiIcon fontSize="inherit" />
              AI for {jobLabelOf(job)}
              <AiInfoButton hasEntry />
              <AiSettingsButton task="chat" />
            </Box>
            <Box sx={{ flex: 1 }} />
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={!isReworded || isBusy}
              sx={{ borderColor: WORKSPACE_COLORS.borderStrong }}
              onClick={() => setText(undefined)}
            >
              Use the vault text
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography sx={stepLabelSx}>1 · Lean on</Typography>
            <AiButton
              size="small"
              variant="outlined"
              sx={actionSx}
              disabled={keywords.length === 0}
              title={
                keywords.length === 0
                  ? "Analyse the job description first"
                  : undefined
              }
              onClick={() => setIsPickerOpen(true)}
            >
              Pick points from the advert
            </AiButton>
            {leanOn.map((point) => (
              <Chip
                key={point}
                size="small"
                color="secondary"
                label={point}
                onDelete={() => onLeanOn(leanOn.filter((p) => p !== point))}
                sx={{ maxWidth: 260 }}
              />
            ))}
            {leanOn.length > 0 && (
              <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.aiText }}>
                {leanOn.length} picked ·{" "}
                <Link
                  component="button"
                  type="button"
                  underline="always"
                  color="inherit"
                  sx={{ fontSize: 12, verticalAlign: "baseline" }}
                  onClick={() => onLeanOn([])}
                >
                  Clear
                </Link>
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography sx={stepLabelSx}>2 · Then</Typography>
            {MODES.map(({ mode, label, needsKeywords }) => (
              <AiButton
                key={mode}
                size="small"
                variant="outlined"
                sx={actionSx}
                disabled={
                  isBusy || (needsKeywords === true && keywords.length === 0)
                }
                title={
                  mode === "shorten" && leanOn.length > 0
                    ? "Shortens the text and keeps the points you picked"
                    : needsKeywords && keywords.length === 0
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
            {canMakeBullets && (
              <>
                <Box
                  aria-hidden="true"
                  sx={{
                    width: "1px",
                    height: 20,
                    mx: 0.5,
                    bgcolor: WORKSPACE_COLORS.aiBorder,
                  }}
                />
                <AiButton
                  size="small"
                  variant="contained"
                  disabled={isBusy}
                  startIcon={
                    bullets.busy === "make" ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : undefined
                  }
                  onClick={() => void bullets.ask("make")}
                >
                  {bullets.busy === "make" ? "Making…" : "Make bullets"}
                </AiButton>
              </>
            )}
          </Box>
          {canMakeBullets && bullets.hiddenFields.includes("description") && (
            <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.aiText }}>
              The description is left out of this job, the bullets replace it.
              Use the eye next to Description to show it again.
            </Typography>
          )}
          {canMakeBullets && bullets.hasGenerated && (
            <Box>
              <Button size="small" onClick={bullets.useVaultBullets}>
                Use the vault’s bullets instead
              </Button>
            </Box>
          )}
        </Box>
      </Box>
      <EmphasiseDialog
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        target={field === "description" ? "bullets" : "text"}
        initial={leanOn}
        onConfirm={onLeanOn}
      />
      {isReworded && !proposal && (
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          Worded for this job only. The vault keeps your own text.
        </Typography>
      )}
      {(error || bullets.error) && (
        <Alert severity="error">{error || bullets.error}</Alert>
      )}
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
      {bullets.proposal && (
        <BulletsProposal
          proposal={bullets.proposal}
          ticked={bullets.ticked}
          onTick={bullets.setTicked}
          replaceDescription={bullets.replaceDescription}
          onReplaceDescription={bullets.setReplaceDescription}
          onDiscard={() => bullets.setProposal(null)}
          onUse={bullets.accept}
        />
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
  // What the user picked to lean on for this entry: kept until cleared, used by every AI action
  const [leanOn, setLeanOn] = useState<string[]>([]);

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
          const isAiText = choice?.fieldText?.[spec.key] !== undefined;
          const textNode = (
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
          );
          const markedText = isAiText ? (
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>{textNode}</Box>
              <AiBadge />
            </Box>
          ) : (
            textNode
          );
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
                {canReword && (isShown || spec.key === "description") ? (
                  // the description keeps its AI strip when bullets replace it in this job
                  <TextActions
                    item={item}
                    field={spec.key}
                    keywords={keywords}
                    leanOn={leanOn}
                    onLeanOn={setLeanOn}
                  >
                    {markedText}
                  </TextActions>
                ) : (
                  textNode
                )}
              </Box>
            </Box>
          );
        })}
    </>
  );
}
