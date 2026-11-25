import { useEffect, useMemo, useRef, useState } from "react";
import { useViewport } from "@hooks/use-viewport";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@components/ui";
import { AiButton, AiIcon } from "@components/ai-button";
import { CloseOutlined as CloseOutlinedIcon } from "@components/ui/icons";
import {
  MASK_KINDS,
  MaskKind,
  Masking,
  MaskTerm,
} from "@custom-types/masking-types";
import { openTutorial } from "@pages/workspace/tutorial-event";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  SendApproval,
  SendApprovalRequest,
  SendPreviewData,
  registerSendHost,
  writeRememberedMasks,
} from "@store/persistence/send-gate";
import { AI_PROVIDER_INFO } from "@shared/ai/providers";
import {
  estimateRequestCost,
  formatTokens,
  formatUsd,
  modelLabel,
} from "@shared/ai/pricing";
import {
  SendCostSummary,
  costSuffix,
} from "@pages/workspace/send-cost-summary";
import { ApiError, createApiClient } from "@store/persistence/api-client";
import { notify } from "@components/notifications/notify";
import { openAiSettings } from "@pages/workspace/ai-settings-event";
import {
  AiUsageEntry,
  onAiUsageRecorded,
} from "@store/persistence/ai-usage-log";
import { toReadableParts } from "@shared/ai/readable-text";

const KIND_LABELS: Record<MaskKind, string> = {
  company: "Company",
  school: "Institution",
  person: "Person",
  location: "Location",
  date: "Date",
  other: "Other",
};
const MAX_SELECTION_LENGTH = 120;
const MIN_SELECTION_LENGTH = 2;

function normalise(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The text with the placeholders drawn as chips, so the user sees what was hidden */
function MaskedText({
  text,
  placeholders,
}: {
  text: string;
  placeholders: string[];
}): JSX.Element {
  const parts = useMemo(() => {
    if (placeholders.length === 0) {
      return [text];
    }
    const pattern = new RegExp(
      `(${placeholders.map(escapeRegExp).join("|")})`,
      "g"
    );
    return text.split(pattern);
  }, [text, placeholders]);
  const known = new Set(placeholders);
  return (
    <>
      {parts.map((part, index) =>
        known.has(part) ? (
          <Box
            key={index}
            component="mark"
            sx={{
              bgcolor: "action.selected",
              color: "text.primary",
              borderRadius: 0.5,
              px: 0.25,
              fontWeight: 600,
            }}
          >
            {part}
          </Box>
        ) : (
          part
        )
      )}
    </>
  );
}

function TermRow({
  term,
  onToggle,
  onRemove,
}: {
  term: MaskTerm;
  onToggle: () => void;
  onRemove: () => void;
}): JSX.Element {
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0 }}
      data-testid="mask-term"
    >
      {term.isCustom ? (
        <IconButton
          size="small"
          aria-label={`Stop masking ${term.value}`}
          onClick={onRemove}
        >
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      ) : (
        <Checkbox
          size="small"
          checked={term.isMasked}
          onChange={onToggle}
          slotProps={{ input: { "aria-label": `Mask ${term.value}` } }}
        />
      )}
      <Typography
        variant="body2"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textDecoration: term.isMasked ? "none" : "line-through",
        }}
        title={term.value}
      >
        {term.value}
      </Typography>
      {!term.isMasked && !term.isCustom && (
        <Typography
          variant="caption"
          sx={{ flexShrink: 0, fontWeight: 600, color: "var(--wrt)" }}
        >
          sent as written
        </Typography>
      )}
      <Chip
        size="small"
        label={term.placeholder}
        variant={term.isMasked ? "filled" : "outlined"}
      />
      {term.count > 0 && (
        <Typography variant="caption" color="text.secondary">
          ×{term.count}
        </Typography>
      )}
    </Box>
  );
}

interface DialogState {
  request: SendApprovalRequest;
  resolve: (approval: SendApproval | null) => void;
}

/** The notice after a request: what it used and what that cost */
function describeUsage(entry: AiUsageEntry): string {
  const tokens = `${formatTokens(entry.inputTokens)} in / ${formatTokens(entry.outputTokens)} out`;
  let cost: string;
  if (entry.costUsd === undefined) {
    cost = "price unknown";
  } else if (entry.costUsd === 0) {
    cost = "free";
  } else {
    cost = formatUsd(entry.costUsd);
  }
  return `${entry.what}: ${cost} (${tokens}${entry.model ? `, ${modelLabel(entry.model)}` : ""})`;
}

/**
 * The "Send to AI" step (shown before text goes to an online model): the exact text the model
 * will receive, what was hidden automatically (and a switch for each), a way to hide more by
 * selecting words in the text, and a note when the advert is private. Only "Send" lets the
 * request go; the model's answer gets the real words back on the server.
 */
function SendToAiDialog({ request, resolve }: DialogState): JSX.Element {
  const isPhone = useViewport() === "phone";
  const [masking, setMasking] = useState<Masking>(request.initial);
  const [preview, setPreview] = useState<SendPreviewData>(request.preview);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [isPrivateAdvert, setIsPrivateAdvert] = useState(false);
  const [isRaw, setIsRaw] = useState(false);
  const [typedMask, setTypedMask] = useState("");
  const [typedKind, setTypedKind] = useState<MaskKind>("other");
  const [shouldKeepMasks, setShouldKeepMasks] = useState(
    request.initial.custom.length > 0
  );
  const viewer = useRef<HTMLDivElement>(null);
  const latest = useRef(0);
  const provider = AI_PROVIDER_INFO[preview.provider];
  const api = useMemo(() => createApiClient(), []);
  const estimate = useMemo(
    () => estimateRequestCost(preview.provider, preview.model, preview.calls),
    [preview]
  );

  function change(next: Masking): void {
    setMasking(next);
    setSelected("");
    setError("");
    setIsLoading(true);
    latest.current += 1;
    const ticket = latest.current;
    request
      .refresh(next)
      .then((answer) => {
        if (ticket === latest.current) {
          setPreview(answer);
        }
      })
      .catch((reason: unknown) => {
        if (ticket === latest.current) {
          setError(
            reason instanceof Error ? reason.message : "The preview failed."
          );
        }
      })
      .finally(() => {
        if (ticket === latest.current) {
          setIsLoading(false);
        }
      });
  }

  /** Uses another model for this task from now on, then works the estimate out again */
  function changeModel(model: string): void {
    if (!preview.task) {
      return;
    }
    setError("");
    setIsLoading(true);
    latest.current += 1;
    const ticket = latest.current;
    api
      .setAiModels({ [preview.task]: model })
      .then(() => request.refresh(masking))
      .then((answer) => {
        if (ticket === latest.current) {
          setPreview(answer);
        }
      })
      .catch((reason: unknown) => {
        if (ticket === latest.current) {
          setError(
            reason instanceof ApiError || reason instanceof Error
              ? reason.message
              : "Could not change the model."
          );
        }
      })
      .finally(() => {
        if (ticket === latest.current) {
          setIsLoading(false);
        }
      });
  }

  function addMask(text: string, kind: MaskKind): void {
    const value = text.trim();
    if (value === "") {
      return;
    }
    change({ ...masking, custom: [...masking.custom, { text: value, kind }] });
  }

  /** Several suggestions hidden in one step (one refreshed preview, not one per word) */
  function addAllSuggestions(values: string[]): void {
    const known = new Set(masking.custom.map((entry) => normalise(entry.text)));
    const added: Masking["custom"] = values
      .filter((value) => !known.has(normalise(value)))
      .map((value) => ({ text: value, kind: "other" }));
    if (added.length > 0) {
      change({ ...masking, custom: [...masking.custom, ...added] });
    }
  }

  /** The typed word or phrase: the same as selecting it in the text, for keyboard and touch */
  function addTyped(): void {
    addMask(typedMask, typedKind);
    setTypedMask("");
  }

  function removeCustom(value: string): void {
    change({
      ...masking,
      custom: masking.custom.filter(
        (entry) => normalise(entry.text) !== normalise(value)
      ),
    });
  }

  function toggleAutomatic(term: MaskTerm): void {
    const key = normalise(term.value);
    change({
      ...masking,
      skip: term.isMasked
        ? [...masking.skip, key]
        : masking.skip.filter((entry) => entry !== key),
    });
  }

  function readSelection(): void {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    const isInside =
      selection?.anchorNode !== undefined &&
      selection?.anchorNode !== null &&
      viewer.current?.contains(selection.anchorNode) === true;
    setSelected(
      isInside &&
        text.length >= MIN_SELECTION_LENGTH &&
        text.length <= MAX_SELECTION_LENGTH &&
        !text.includes("\n")
        ? text
        : ""
    );
  }

  function send(): void {
    writeRememberedMasks(shouldKeepMasks ? masking.custom : []);
    resolve({ masking });
  }

  const placeholders = useMemo(
    () =>
      preview.terms.filter((term) => term.isMasked).map((t) => t.placeholder),
    [preview.terms]
  );
  // The job requirements that requests carry first are shown once, folded, below the CV text
  const contexts = isRaw
    ? []
    : [
        ...new Set(
          preview.calls
            .map((call) => toReadableParts(call.input).context)
            .filter((context) => context !== "")
        ),
      ];
  const automatic = preview.terms.filter((term) => !term.isCustom);
  const custom = preview.terms.filter((term) => term.isCustom);
  // Rows the user unticked: these words leave the computer as they are
  const asWritten = automatic.filter((term) => !term.isMasked).length;
  const messageCount = preview.calls.length;

  return (
    <Dialog
      open
      onClose={() => resolve(null)}
      maxWidth="lg"
      fullWidth
      fullScreen={isPhone}
      aria-labelledby="send-to-ai-title"
    >
      <DialogTitle id="send-to-ai-title">
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <AiIcon />
          {request.subject
            ? `Send ${request.subject} to ${provider.recipient}?`
            : `Send to ${provider.recipient}?`}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {request.scope}. {provider.detail} Check the text below, hide anything
          private, then send.{" "}
          <Button
            size="small"
            color="secondary"
            onClick={() => openTutorial("ai")}
            sx={{ textTransform: "none", p: 0, minWidth: 0 }}
          >
            How does this work?
          </Button>
        </Typography>
        {provider.warning && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {provider.warning}
          </Alert>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              md: "minmax(0, 3fr) minmax(0, 2fr)",
            },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                minHeight: 36,
              }}
              aria-live="polite"
            >
              <Typography
                variant="body2"
                color={selected ? "text.primary" : "text.secondary"}
                noWrap
                sx={{ minWidth: 0 }}
              >
                {selected
                  ? `Hide “${
                      selected.length > 30
                        ? `${selected.slice(0, 30)}…`
                        : selected
                    }” as`
                  : "Select a name or phrase in the text to hide it everywhere it appears."}
              </Typography>
              {isLoading && <CircularProgress size={16} />}
              <Box sx={{ flex: 1 }} />
              <ToggleButtonGroup
                exclusive
                size="small"
                aria-label="How the text is shown"
                value={isRaw ? "exact" : "readable"}
                onChange={(_event, next: "readable" | "exact" | null) => {
                  if (next !== null) {
                    setIsRaw(next === "exact");
                  }
                }}
              >
                <ToggleButton value="readable">Readable</ToggleButton>
                <ToggleButton value="exact">Exact text</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {/* The kinds sit on their own line (always there, so nothing jumps when text is
                selected); if they are wider than the panel only this line scrolls sideways */}
            <Box
              sx={{
                display: "flex",
                gap: 0.75,
                minHeight: 36,
                mb: 0.5,
                overflowX: "auto",
                alignItems: "center",
                pb: 0.25,
              }}
            >
              {selected &&
                MASK_KINDS.map((kind) => (
                  <Button
                    key={kind}
                    size="small"
                    variant="outlined"
                    sx={{ flexShrink: 0 }}
                    // Keep the text selected while the button is pressed
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => addMask(selected, kind)}
                  >
                    {KIND_LABELS[kind]}
                  </Button>
                ))}
            </Box>
            <Box
              ref={viewer}
              onMouseUp={readSelection}
              onKeyUp={readSelection}
              tabIndex={0}
              role="region"
              aria-label="The text that will be sent"
              sx={{
                maxHeight: "52vh",
                overflow: "auto",
                border: `1px solid ${WORKSPACE_COLORS.border}`,
                borderRadius: 1,
                p: 1.5,
                fontFamily: isRaw ? "monospace" : "inherit",
                fontSize: 13,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {preview.calls.map((call, index) => (
                <Box
                  key={`${call.promptName}-${index.toString()}`}
                  sx={{ mb: index < preview.calls.length - 1 ? 2 : 0 }}
                >
                  {preview.calls.length > 1 && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", fontFamily: "inherit" }}
                    >
                      Message {index + 1} of {preview.calls.length}
                    </Typography>
                  )}
                  <MaskedText
                    text={isRaw ? call.input : toReadableParts(call.input).main}
                    placeholders={placeholders}
                  />
                </Box>
              ))}
              {contexts.length > 0 && (
                <Box component="details" sx={{ mt: 2 }}>
                  <Box component="summary" sx={{ cursor: "pointer" }}>
                    Job requirements, sent with{" "}
                    {preview.calls.length > 1 ? "each message" : "this message"}
                  </Box>
                  {contexts.map((context) => (
                    <Box
                      key={context}
                      sx={{ mt: 0.5, color: "text.secondary" }}
                    >
                      <MaskedText text={context} placeholders={placeholders} />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
            <details>
              <summary>
                <Typography variant="caption" component="span">
                  Instructions sent with it
                </Typography>
              </summary>
              <Box
                sx={{
                  maxHeight: 160,
                  overflow: "auto",
                  fontFamily: "monospace",
                  fontSize: 12,
                  whiteSpace: "pre-wrap",
                  color: "text.secondary",
                }}
              >
                {preview.calls.map((call, index) => (
                  <Box key={`${call.promptName}-s${index.toString()}`}>
                    {call.system}
                  </Box>
                ))}
              </Box>
            </details>
          </Box>

          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              alignContent: "start",
              minWidth: 0,
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Hidden automatically
              </Typography>
              {automatic.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nothing found. Your name, contact details, employers and
                  schools are hidden when they appear.
                </Typography>
              ) : (
                automatic.map((term) => (
                  <TermRow
                    key={term.placeholder}
                    term={term}
                    onToggle={() => toggleAutomatic(term)}
                    onRemove={() => removeCustom(term.value)}
                  />
                ))
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Hidden by you
              </Typography>
              {custom.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nothing yet.
                </Typography>
              ) : (
                custom.map((term) => (
                  <TermRow
                    key={term.placeholder}
                    term={term}
                    onToggle={() => toggleAutomatic(term)}
                    onRemove={() => removeCustom(term.value)}
                  />
                ))
              )}
              <Box sx={{ display: "flex", gap: 0.75, mt: 0.75 }}>
                <TextField
                  size="small"
                  label="Hide a word or phrase"
                  value={typedMask}
                  onChange={(event) => setTypedMask(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTyped();
                    }
                  }}
                  sx={{ flex: 1, minWidth: 0 }}
                />
                <TextField
                  select
                  size="small"
                  label="As"
                  value={typedKind}
                  onChange={(event) =>
                    setTypedKind(event.target.value as MaskKind)
                  }
                  sx={{ width: 120 }}
                >
                  {MASK_KINDS.map((kind) => (
                    <MenuItem key={kind} value={kind}>
                      {KIND_LABELS[kind]}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  disabled={typedMask.trim().length < MIN_SELECTION_LENGTH}
                  onClick={addTyped}
                >
                  Hide
                </Button>
              </Box>
              <FormControlLabel
                sx={{ mt: 0.5 }}
                control={
                  <Checkbox
                    size="small"
                    checked={shouldKeepMasks}
                    onChange={(event) =>
                      setShouldKeepMasks(event.target.checked)
                    }
                  />
                }
                label={
                  <Typography variant="body2">
                    Remember my own masks next time (kept on this device)
                  </Typography>
                }
              />
            </Box>

            {preview.suggestions.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                  Also looks private
                </Typography>
                {preview.suggestions.length > 1 && (
                  <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      onClick={() => addAllSuggestions(preview.suggestions)}
                    >
                      Hide all
                    </Button>
                  </Box>
                )}
                {preview.suggestions.map((value) => (
                  <Box
                    key={value}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 0.5,
                      borderRadius: 0.5,
                      // The row under the pointer is highlighted, so its Hide button is easy to match
                      "&:hover": { bgcolor: WORKSPACE_COLORS.hover },
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={value}
                    >
                      {value}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => addMask(value, "other")}
                    >
                      Hide
                    </Button>
                  </Box>
                ))}
              </Box>
            )}

            {request.hasAdvert && (
              <Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={isPrivateAdvert}
                      onChange={(event) =>
                        setIsPrivateAdvert(event.target.checked)
                      }
                    />
                  }
                  label={
                    <Typography variant="body2">
                      This job advert is private or confidential
                    </Typography>
                  }
                />
                {isPrivateAdvert && (
                  <Alert severity="warning" sx={{ mt: 0.5 }}>
                    Select the company, recruiter and project names in the
                    advert and hide them, or cancel. A public advert is fine to
                    send as it is.
                  </Alert>
                )}
              </Box>
            )}

            <Typography variant="caption" color="text.secondary">
              Hiding is best-effort: words you do not hide, dates and wording
              are still sent, and they can identify you.
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <SendCostSummary
            preview={preview}
            estimate={estimate}
            isBusy={isLoading}
            onChangeModel={changeModel}
          />
          {asWritten > 0 && (
            <Typography
              variant="caption"
              role="status"
              sx={{ display: "block", fontWeight: 600, color: "var(--wrt)" }}
            >
              Sends {asWritten} {asWritten === 1 ? "item" : "items"} as written
              because they are unticked.
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={() => resolve(null)}>Cancel</Button>
          <AiButton variant="contained" disabled={isLoading} onClick={send}>
            {(messageCount > 1
              ? `Send ${messageCount} requests to ${provider.recipient}`
              : `Send to ${provider.recipient}`) + costSuffix(estimate)}
          </AiButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Mount once. Shows the "Send to AI" dialog for every request that the API client holds back
 * (`gateAiFetch`); requests wait in line when several arrive together.
 */
export function SendToAiHost(): JSX.Element | null {
  const [state, setState] = useState<DialogState | null>(null);
  const chain = useRef<Promise<unknown>>(Promise.resolve());

  // After each AI request, say what it cost (the details are in AI settings > Cost and usage)
  useEffect(
    () =>
      onAiUsageRecorded((entry) =>
        notify({
          kind: "info",
          isAi: true,
          text: describeUsage(entry),
          action: { label: "Usage", onClick: () => openAiSettings("cost") },
        })
      ),
    []
  );

  useEffect(
    () =>
      registerSendHost((request) => {
        const run = chain.current.then(
          () =>
            new Promise<SendApproval | null>((resolve) => {
              setState({
                request,
                resolve: (approval) => {
                  setState(null);
                  resolve(approval);
                },
              });
            })
        );
        chain.current = run.catch(() => undefined);
        return run;
      }),
    []
  );

  return state ? <SendToAiDialog {...state} /> : null;
}
