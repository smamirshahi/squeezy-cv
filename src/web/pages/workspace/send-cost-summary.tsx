import { useEffect, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from "@components/ui";
import {
  ExpandMoreOutlined as ExpandMoreIcon,
  InfoOutlined as InfoIcon,
} from "@components/ui/icons";
import { AiIcon } from "@components/ai-button";
import {
  CostEstimate,
  costHeadline,
  formatPriceDate,
  formatTokens,
  formatUsd,
  modelLabel,
  priceOf,
  pricedModelsOf,
  shortCost,
  wordCount,
} from "@shared/ai/pricing";
import { AI_PROVIDER_INFO } from "@shared/ai/providers";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { SendPreviewData } from "@store/persistence/send-gate";
import {
  monthTotal,
  readAiUsage,
  subscribeAiUsage,
} from "@store/persistence/ai-usage-log";

const AI_TEXT = { color: WORKSPACE_COLORS.aiText };

/** The words on the Send button after the destination: the cost in a few characters ("~1¢", "free") */
export function costSuffix(estimate: CostEstimate): string {
  if (
    estimate.kind === "free" ||
    (estimate.kind === "priced" && estimate.hasFreeTier)
  ) {
    return " · free";
  }
  return estimate.kind === "priced" ? ` · ~${shortCost(estimate.lowUsd)}` : "";
}

/** "about 1,300 words sent" or, for several requests, "about 2,400 words sent in 9 requests" */
function sentLine(tokens: number, requests: number): string {
  return `about ${wordCount(tokens)} words sent${
    requests > 1 ? ` in ${requests} requests` : ""
  }`;
}

/** The plain-language cost, in bold where it matters */
function Headline({
  estimate,
  recipient,
}: {
  estimate: CostEstimate;
  recipient: string;
}): JSX.Element {
  if (estimate.kind === "free") {
    return (
      <span>
        <b>Free</b>, it runs on this computer
      </span>
    );
  }
  if (estimate.kind === "unknown") {
    return <span>Price unknown for this model</span>;
  }
  const { main, upTo } = costHeadline(estimate.lowUsd, estimate.highUsd);
  if (estimate.hasFreeTier) {
    return (
      <span>
        <b>Free</b> within {recipient}'s free limits, otherwise about{" "}
        <b>{main}</b>
        {upTo ? `, up to ${upTo} if the answer is long` : ""}
      </span>
    );
  }
  return (
    <span>
      About <b>{main}</b>
      {upTo ? `, up to ${upTo} if the answer is long` : ""}
    </span>
  );
}

/** The dark "Why a range?" box: what is known (what you send) and what is not (how long the answer is) */
function WhyRange({
  estimate,
  recipient,
}: {
  estimate: Extract<CostEstimate, { kind: "priced" }>;
  recipient: string;
}): JSX.Element {
  return (
    <Box
      role="tooltip"
      sx={{
        position: "absolute",
        left: 0,
        bottom: "100%",
        mb: 1,
        width: 340,
        maxWidth: "calc(100vw - 48px)",
        p: "12px 14px",
        borderRadius: 1,
        bgcolor: WORKSPACE_COLORS.bar,
        color: WORKSPACE_COLORS.barText,
        display: "grid",
        gap: 0.75,
        fontSize: 13,
        zIndex: 3,
      }}
    >
      <b>Why a range?</b>
      <Box sx={{ display: "flex", gap: 1 }}>
        <span style={{ flex: 1 }}>What you send (known)</span>
        <span>{formatUsd(estimate.inputUsd)}</span>
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <span style={{ flex: 1 }}>
          {recipient}'s answer (depends on length)
        </span>
        <span>
          {formatUsd(estimate.outputLowUsd)} to{" "}
          {formatUsd(estimate.outputHighUsd)}
        </span>
      </Box>
      <Box sx={{ height: "1px", bgcolor: "rgba(255,255,255,.2)" }} />
      <Box sx={{ display: "flex", gap: 1 }}>
        <span style={{ flex: 1 }}>Total</span>
        <b>
          {formatUsd(estimate.lowUsd)} to {formatUsd(estimate.highUsd)}
        </b>
      </Box>
      <Box sx={{ fontSize: 12, opacity: 0.8 }}>
        {wordCount(estimate.inputTokens)} words is about{" "}
        {formatTokens(estimate.inputTokens)} tokens. Prices in US dollars, from{" "}
        {recipient}'s price list, checked {formatPriceDate()}. This is an
        estimate.
      </Box>
    </Box>
  );
}

/**
 * The left side of the "Send to AI" footer (#551): the model and a way to change it, what the
 * request will probably cost in plain words (with the reason for the range), and what this month
 * already cost with this provider. Nothing here sends anything.
 */
export function SendCostSummary({
  preview,
  estimate,
  isBusy,
  onChangeModel,
}: {
  preview: SendPreviewData;
  estimate: CostEstimate;
  isBusy: boolean;
  onChangeModel: (model: string) => void;
}): JSX.Element {
  const info = AI_PROVIDER_INFO[preview.provider];
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [isWhyOpen, setIsWhyOpen] = useState(false);
  const [entries, setEntries] = useState(() => readAiUsage());
  useEffect(() => subscribeAiUsage(() => setEntries(readAiUsage())), []);
  const month = monthTotal(entries, new Date(), preview.provider);
  const models = pricedModelsOf(preview.provider);
  if (preview.model && !models.includes(preview.model)) {
    models.unshift(preview.model);
  }
  const canChange = preview.task !== undefined && models.length > 1;
  const requests = preview.calls.length;

  return (
    <Box sx={{ display: "grid", gap: 0.5, position: "relative", flex: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <AiIcon fontSize="small" />
        <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
          {preview.model ? modelLabel(preview.model) : info.label}
        </Typography>
        {canChange && (
          <>
            <Button
              size="small"
              color="secondary"
              aria-haspopup="listbox"
              disabled={isBusy}
              endIcon={<ExpandMoreIcon fontSize="small" />}
              onClick={(event) => setAnchor(event.currentTarget)}
              sx={{ textTransform: "none", minWidth: 0 }}
            >
              Change
            </Button>
            <Menu
              anchorEl={anchor}
              open={anchor !== null}
              onClose={() => setAnchor(null)}
            >
              {models.map((model) => {
                const price = priceOf(model);
                return (
                  <MenuItem
                    key={model}
                    selected={model === preview.model}
                    onClick={() => {
                      setAnchor(null);
                      if (model !== preview.model) {
                        onChangeModel(model);
                      }
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 14 }}>
                        {modelLabel(model)}
                      </Typography>
                      {price && (
                        <Typography
                          sx={{ fontSize: 12, color: "text.secondary" }}
                        >
                          ${price.input} in / ${price.output} out per million
                          tokens
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                );
              })}
            </Menu>
          </>
        )}
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 0.75,
          fontSize: 14,
        }}
        role="status"
      >
        <Headline estimate={estimate} recipient={info.recipient} />
        <Typography
          component="span"
          sx={{ fontSize: 12, color: "text.secondary" }}
        >
          · {sentLine(estimate.inputTokens, requests)}
        </Typography>
        {estimate.kind === "priced" && (
          <IconButton
            size="small"
            aria-label="Why a range?"
            aria-expanded={isWhyOpen}
            onClick={() => setIsWhyOpen((open) => !open)}
            sx={{ width: 28, height: 28, ...AI_TEXT }}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Typography variant="caption" color="text.secondary">
        {month.count > 0
          ? `This month on ${info.recipient}: ${formatUsd(month.usd)} across ${month.count} ${
              month.count === 1 ? "request" : "requests"
            } · `
          : ""}
        Nothing leaves your computer until you press Send.
        {requests > 1 && info.isOnline
          ? ` The ${requests} requests go out one after another; a free tier's limits may slow this down.`
          : ""}
      </Typography>
      {isWhyOpen && estimate.kind === "priced" && (
        <WhyRange estimate={estimate} recipient={info.recipient} />
      )}
    </Box>
  );
}
