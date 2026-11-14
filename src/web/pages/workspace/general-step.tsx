import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@components/ui";
import {
  AutoAwesomeOutlined as AutoAwesomeOutlinedIcon,
  InfoOutlined as InfoOutlinedIcon,
} from "@components/ui/icons";
import { AiProviderId, AiTask } from "@shared/ai/providers";
import { cssVar } from "@custom-styles/theme";
import { AiProviderPicker } from "@pages/workspace/ai-provider-picker";
import { AiHidePicks } from "@pages/workspace/ai-hide-picks";
import { HideToFit } from "@pages/workspace/hide-to-fit";
import { TailorAll } from "@pages/workspace/tailor-all";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  AiStatus,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import {
  activeVariantSelector,
  setAutoFit,
  setPageLimit,
} from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/** 1 and 2 have buttons; the number field starts at the next page count */
const PRESET_LIMITS = [1, 2];
const MIN_CUSTOM = 3;
const MAX_PAGES = 10;
const MAX_THUMBNAILS = 6;

const SEGMENT_SX = {
  flex: 1,
  borderRadius: 0,
  textTransform: "none",
  fontWeight: 500,
  color: WORKSPACE_COLORS.text,
  borderColor: cssVar("ib"),
  "&.Mui-selected, &.Mui-selected:hover": {
    bgcolor: WORKSPACE_COLORS.accentSoft,
    color: WORKSPACE_COLORS.accentText,
    fontWeight: 700,
  },
} as const;

/** One small page drawing: normal inside the limit, dashed amber beyond it */
function PageThumb({
  label,
  isOver = false,
}: {
  label: string;
  isOver?: boolean;
}): JSX.Element {
  return (
    <Box sx={{ display: "grid", justifyItems: "center", gap: 0.5 }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 34,
          height: 46,
          borderRadius: "3px",
          boxSizing: "border-box",
          p: "7px 6px",
          display: "grid",
          gap: "4px",
          alignContent: "start",
          border: isOver
            ? `1px dashed ${cssVar("wr")}`
            : `1px solid ${WORKSPACE_COLORS.border}`,
          bgcolor: isOver ? cssVar("wrs") : WORKSPACE_COLORS.panelAlt,
          "& i": {
            display: "block",
            height: 3,
            borderRadius: "2px",
            bgcolor: isOver ? cssVar("wr") : WORKSPACE_COLORS.borderStrong,
          },
        }}
      >
        <i />
        <i />
        {!isOver && <i />}
      </Box>
      <Typography
        sx={{
          fontSize: 11,
          color: isOver ? cssVar("wrt") : WORKSPACE_COLORS.muted,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

/** The result of the page limit, next to the control: pages vs limit and where the overflow starts */
function PageResult(): JSX.Element {
  const limit = useAppSelector(activeVariantSelector).pageLimit;
  const { pageCount, usedPercent, overflowStartsWith } = useAppSelector(
    (s) => s.app.fit
  );
  const isOver = pageCount > limit;
  const inside = Math.min(pageCount, limit, MAX_THUMBNAILS);
  const startsAt = overflowStartsWith
    ? `Page ${limit + 1} starts at “${overflowStartsWith}”.`
    : "";
  const detail = isOver ? startsAt : `${usedPercent}% of the limit used.`;
  const outside = Math.min(pageCount - limit, MAX_THUMBNAILS - inside);
  return (
    <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.25 }}>
      {Array.from({ length: inside }, (_unused, index) => (
        <PageThumb key={index} label={`Page ${index + 1}`} />
      ))}
      {isOver && (
        <>
          <Box
            aria-hidden="true"
            sx={{
              height: 60,
              borderLeft: `2px dashed ${WORKSPACE_COLORS.accent}`,
              mx: 0.25,
              mb: 2.5,
            }}
          />
          {Array.from({ length: Math.max(1, outside) }, (_unused, index) => (
            <PageThumb key={index} isOver label={`Page ${limit + index + 1}`} />
          ))}
        </>
      )}
      <Box sx={{ flex: 1, pl: 1, mb: 2.5, display: "grid", gap: 0.25 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
          {isOver
            ? `${pageCount} pages now, limit is ${limit}`
            : `${pageCount} ${pageCount === 1 ? "page" : "pages"}, limit is ${limit}`}
        </Typography>
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          {detail}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * The "General" step of the right panel (design: Apply wizard, General step): the page limit
 * with its result and the ways out, and one purple card for everything that asks an AI.
 */
export function GeneralStep(): JSX.Element {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const { linesOver, pageCount } = useAppSelector((s) => s.app.fit);
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [isHideOpen, setIsHideOpen] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");
  const limit = variant.pageLimit;
  const isOver = pageCount > limit || linesOver > 0;
  const isAutoFit = variant.isAutoFit ?? false;
  const isCustomShown = limit >= MIN_CUSTOM;
  const ai = status ? taskProvider(status, "hide") : null;
  const overText =
    linesOver > 0
      ? `Over by ${linesOver} ${linesOver === 1 ? "line" : "lines"}`
      : "Over the limit";
  const statusText = isOver ? overText : "Fits";

  useEffect(() => {
    api
      .getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [api]);

  async function chooseProvider(
    task: AiTask,
    provider: AiProviderId
  ): Promise<void> {
    try {
      const choice = await api.setAiChoice({ [task]: provider });
      setStatus((current) => (current ? { ...current, choice } : current));
      setAiError("");
    } catch (caught) {
      setAiError(
        caught instanceof Error ? caught.message : "Could not change the AI."
      );
    }
  }

  function changeLimit(value: number): void {
    if (value >= 1 && value <= MAX_PAGES) {
      dispatch(setPageLimit({ id: variant.id, pageLimit: value }));
    }
  }

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box
        component="section"
        aria-labelledby="page-limit-heading"
        sx={{
          display: "grid",
          gap: 1.75,
          p: 2,
          bgcolor: WORKSPACE_COLORS.panel,
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          borderRadius: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              id="page-limit-heading"
              component="h2"
              sx={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: WORKSPACE_COLORS.muted,
              }}
            >
              Page limit
            </Typography>
            <Tooltip title="Recruiters usually expect 1 page, 2 at most.">
              <InfoOutlinedIcon
                role="img"
                aria-label="Recruiters usually expect 1 page, 2 at most."
                sx={{ fontSize: 16, color: WORKSPACE_COLORS.muted }}
              />
            </Tooltip>
          </Box>
          <Box
            role="status"
            sx={{
              borderRadius: 999,
              px: 1.25,
              py: 0.375,
              fontSize: 12,
              fontWeight: 600,
              bgcolor: isOver ? cssVar("wrs") : WORKSPACE_COLORS.panelAlt,
              color: isOver ? cssVar("wrt") : WORKSPACE_COLORS.muted,
              border: `1px solid ${isOver ? cssVar("wrb") : WORKSPACE_COLORS.border}`,
            }}
          >
            {statusText}
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            role="group"
            aria-label="Page limit"
            sx={{
              display: "flex",
              flex: 1,
              border: `1px solid ${cssVar("ib")}`,
              borderRadius: 0.5,
              overflow: "hidden",
            }}
          >
            {PRESET_LIMITS.map((value) => (
              <Button
                key={value}
                aria-pressed={!isCustomShown && limit === value}
                className={
                  !isCustomShown && limit === value ? "Mui-selected" : ""
                }
                sx={{ ...SEGMENT_SX, borderRight: `1px solid ${cssVar("ib")}` }}
                onClick={() => {
                  changeLimit(value);
                }}
              >
                {value} {value === 1 ? "page" : "pages"}
              </Button>
            ))}
            <Button
              aria-pressed={isCustomShown}
              className={isCustomShown ? "Mui-selected" : ""}
              sx={SEGMENT_SX}
              onClick={() => changeLimit(Math.max(limit, MIN_CUSTOM))}
            >
              Custom
            </Button>
          </Box>
          {isCustomShown && (
            <TextField
              size="small"
              type="number"
              label="Pages"
              value={draft === "" ? limit : draft}
              sx={{ width: 90 }}
              slotProps={{
                htmlInput: { min: MIN_CUSTOM, max: MAX_PAGES, step: 1 },
              }}
              onChange={(event) => {
                // Keep what is typed until it is a valid number (so "1" can become "10")
                setDraft(event.target.value);
                const value = Math.round(Number(event.target.value));
                if (value >= MIN_CUSTOM) {
                  changeLimit(value);
                }
              }}
              onBlur={() => setDraft("")}
            />
          )}
        </Box>

        <PageResult />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            p: 1.25,
            bgcolor: WORKSPACE_COLORS.panelAlt,
            border: `1px solid ${WORKSPACE_COLORS.border}`,
            borderRadius: 1.5,
          }}
        >
          <Switch
            size="small"
            checked={isAutoFit}
            slotProps={{
              input: { "aria-label": "Auto-fit to the page limit" },
            }}
            onChange={(event) =>
              dispatch(
                setAutoFit({ id: variant.id, isAutoFit: event.target.checked })
              )
            }
          />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
              Auto-fit to the limit
            </Typography>
            <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
              Shrinks the CV to fit the page limit: first the spacing, then the
              margins, then the text size (never below a readable size). It
              keeps fitting as you edit. Items are never hidden by it.
            </Typography>
            {isOver && !isAutoFit && (
              <Typography
                role="status"
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: WORKSPACE_COLORS.accentText,
                }}
              >
                The CV is over the limit. Turn this on to shrink it to fit.
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            aria-expanded={isHideOpen}
            onClick={() => setIsHideOpen((isOpen) => !isOpen)}
          >
            Choose items to hide
          </Button>
        </Box>
        {isHideOpen && <HideToFit />}
      </Box>

      <Box
        component="section"
        aria-labelledby="ai-heading"
        sx={{
          display: "grid",
          gap: 1.75,
          p: 2,
          bgcolor: WORKSPACE_COLORS.aiSoft,
          border: `1px solid ${cssVar("aib")}`,
          borderRadius: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: WORKSPACE_COLORS.aiText,
            }}
          >
            <AutoAwesomeOutlinedIcon sx={{ fontSize: 18 }} />
            <Typography
              id="ai-heading"
              component="h2"
              sx={{ fontSize: 14, fontWeight: 700 }}
            >
              AI assist
            </Typography>
          </Box>
        </Box>

        {aiError && (
          <Typography role="alert" sx={{ fontSize: 12, color: cssVar("er") }}>
            {aiError}
          </Typography>
        )}
        <Box sx={{ borderTop: `1px solid ${cssVar("aib")}`, pt: 1.5 }}>
          <TailorAll
            isEmbedded
            status={status}
            picker={
              <AiProviderPicker
                status={status}
                task="tailor"
                label="AI to use:"
                onChange={(task, provider) =>
                  void chooseProvider(task, provider)
                }
              />
            }
          />
        </Box>

        <Box
          sx={{
            borderTop: `1px solid ${cssVar("aib")}`,
            pt: 1.5,
            display: "grid",
            gap: 1,
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 600 }}>Pick what to hide</Typography>
            <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.aiText }}>
              {linesOver > 0
                ? `You are ${linesOver} ${linesOver === 1 ? "line" : "lines"} over. AI lists the least relevant items; nothing is hidden until you confirm.`
                : "Available when the CV is over its page limit."}
            </Typography>
          </Box>
          <AiProviderPicker
            status={status}
            task="hide"
            label="AI to use:"
            onChange={(task, provider) => void chooseProvider(task, provider)}
          />
          <AiHidePicks
            isDisabled={!isOver || !ai?.isConfigured}
            linesOver={linesOver}
          />
          {ai?.isConfigured && (
            <Typography sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.aiText }}>
              {ai.info.isOnline
                ? `Sends short item labels, line counts and the job's must-haves to ${ai.info.recipient}. Not your name or contact details.`
                : "Item labels and line counts go to your local model only."}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
