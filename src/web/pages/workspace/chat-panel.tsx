import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Checkbox,
  CircularProgress,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import MoreHorizOutlined from "@mui/icons-material/MoreHorizOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import { Operation } from "@custom-types/chat-types";
import { buildChatContext } from "@shared/chat/chat-context";
import { describeOperation } from "@shared/chat/describe-operation";
import { shorten } from "@shared/variant/item-label";
import { Turn, loadChat, saveChat } from "@pages/workspace/chat-memory";
import { useViewport } from "@hooks/use-viewport";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { operationsToActions } from "@store/chat/operations-to-actions";
import { batch, undo } from "@store/history/history";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { activeVariantSelector } from "@store/jobs/jobs-slice";
import { vaultSelector } from "@store/vault/vault-slice";
import { useStore } from "react-redux";
import { RootState } from "@store/store-helper";
import { AiButton, AiIcon } from "@components/ai-button";
import { openAiSettings } from "@pages/workspace/ai-settings-event";

const MAX_SENT_TURNS = 6;

const EXAMPLES = [
  "Hide the oldest job",
  "Put Skills first",
  "Make the tone more formal",
  "Shorten the first bullet of my current role",
];

const CAN = [
  "Hide or show items and sections",
  "Reorder sections and items",
  "Change tone or page limit",
  "Reword a bullet, as a proposal",
];

function isFlagged(op: Operation): boolean {
  return op.op === "rewriteBullet" && (op.flags?.length ?? 0) > 0;
}

/**
 * Chat (design B5): ask for changes in words. The AI answers with typed operations (hide,
 * move, highlight, wording, tone, page limit); you tick the ones you want, they are applied as one
 * undoable step through the same reducers as a manual edit. Flagged rewordings start unticked.
 */
export function ChatPanel(): JSX.Element {
  const jobId = useAppSelector(activeVariantSelector).id;
  // each job has its own conversation
  return <ChatConversation key={jobId} jobId={jobId} />;
}

function ChatConversation({ jobId }: { jobId: string }): JSX.Element {
  const viewport = useViewport();
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const api = useMemo(() => createApiClient(), []);
  const vault = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  const structure = useAppSelector((s) => s.app.structure);
  const isSaved = useAppSelector((s) => s.persistence.saved !== null);
  const steps = useAppSelector((s) => s.history.past.length);

  const [status, setStatus] = useState<AiStatus | null>(null);
  const [turns, setTurns] = useState<Turn[]>(() => loadChat(jobId));
  const [text, setText] = useState<string>("");
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [chipAnchor, setChipAnchor] = useState<HTMLElement | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const linesOver = useAppSelector((s) => s.app.fit.linesOver);
  const endRef = useRef<HTMLDivElement>(null);
  const target = status ? taskProvider(status, "chat") : null;

  useEffect(() => {
    api
      .getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [api]);

  // the conversation is kept in this browser (not in the data folder), one per job
  useEffect(() => {
    saveChat(jobId, turns);
  }, [jobId, turns]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [turns]);

  async function send(): Promise<void> {
    const message = text.trim();
    if (!message || isBusy) {
      return;
    }
    setText("");
    setError("");
    setIsBusy(true);
    const mine: Turn = { id: Date.now(), role: "user", content: message };
    const before = turns;
    setTurns([...before, mine]);
    try {
      const answer = await api.chat({
        message,
        context: buildChatContext(vault, variant, structure),
        history: before
          .slice(-MAX_SENT_TURNS)
          .map((turn) => ({ role: turn.role, content: turn.content })),
      });
      setTurns((current) => [
        ...current,
        {
          id: mine.id + 1,
          role: "assistant",
          content: answer.reply,
          operations: answer.operations,
          warnings: answer.warnings,
          selected: answer.operations.map((op) => !isFlagged(op)),
        },
      ]);
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The AI request failed."
      );
    } finally {
      setIsBusy(false);
    }
  }

  function dismiss(turn: Turn): void {
    setTurns((current) =>
      current.map((t) =>
        t.id === turn.id
          ? { ...t, operations: undefined, selected: undefined }
          : t
      )
    );
  }

  function toggle(turn: Turn, index: number, isChecked: boolean): void {
    setTurns((current) =>
      current.map((t) =>
        t.id === turn.id
          ? {
              ...t,
              selected: t.selected?.map((value, i) =>
                i === index ? isChecked : value
              ),
            }
          : t
      )
    );
  }

  function apply(turn: Turn): void {
    const chosen = (turn.operations ?? []).filter(
      (_op, index) => turn.selected?.[index]
    );
    const { actions, skipped } = operationsToActions(store.getState(), chosen);
    const asked = turns.find((t) => t.role === "user" && t.id === turn.id - 1);
    dispatch(batch(`Chat: ${shorten(asked?.content ?? "edit", 40)}`, actions));
    if (skipped > 0) {
      setError(
        `${skipped} ${skipped === 1 ? "change" : "changes"} could not be applied: the item is not in this CV any more.`
      );
    }
    setTurns((current) =>
      current.map((t) =>
        t.id === turn.id
          ? {
              ...t,
              appliedAtStep: store.getState().history.past.length,
              appliedCount: chosen.length - skipped,
            }
          : t
      )
    );
  }

  const canAsk = Boolean(target?.isConfigured) && isSaved;
  const pageLimit = variant.pageLimit ?? 1;
  const examples =
    linesOver > 0
      ? [
          `Fit to ${pageLimit} ${pageLimit === 1 ? "page" : "pages"} · over by ${linesOver} ${linesOver === 1 ? "line" : "lines"}`,
          ...EXAMPLES,
        ]
      : EXAMPLES;
  return (
    <ResizableAside
      side="right"
      label="the chat panel"
      defaultWidth={viewport === "desktop" ? 360 : 320}
      stackBelow="md"
      stackedHeight={{ xs: "34vh", sm: "38vh" }}
    >
      <Box
        component="aside"
        aria-label="Chat"
        sx={{
          width: "100%",
          flex: "none",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          bgcolor: WORKSPACE_COLORS.panel,
          color: WORKSPACE_COLORS.text,
          borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
          "& .MuiButton-root": { minHeight: { xs: 44, md: "auto" } },
        }}
      >
        <Box
          sx={{ p: 1.5, borderBottom: `1px solid ${WORKSPACE_COLORS.border}` }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                component="div"
                sx={{ fontWeight: 700, fontSize: 15 }}
                noWrap
              >
                Chat{" "}
                <Box
                  component="span"
                  sx={{
                    fontWeight: 400,
                    fontSize: 12,
                    color: WORKSPACE_COLORS.muted,
                  }}
                >
                  for {variant.name}
                </Box>
              </Typography>
              <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
                Ask for changes. You approve each one.
              </Typography>
            </Box>
            {target && (
              <ButtonBase
                aria-label={`What is sent to ${target.info.label}`}
                onClick={(event) => setChipAnchor(event.currentTarget)}
                sx={{
                  gap: 0.5,
                  px: 1,
                  py: 0.5,
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  color: WORKSPACE_COLORS.aiText,
                  bgcolor: WORKSPACE_COLORS.aiSoft,
                  border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
                }}
              >
                <AiIcon fontSize="inherit" />
                {target.info.label} ·{" "}
                {target.info.isOnline ? "online" : "local"}
                <InfoOutlined sx={{ fontSize: 14 }} />
              </ButtonBase>
            )}
            <Tooltip title="Choose the AI for chat">
              <IconButton
                size="small"
                aria-label="Chat AI settings"
                onClick={() => openAiSettings("chat")}
              >
                <SettingsOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton
              size="small"
              aria-label="More"
              onClick={(event) => setMenuAnchor(event.currentTarget)}
            >
              <MoreHorizOutlined fontSize="small" />
            </IconButton>
          </Box>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem
              disabled={turns.length === 0 || isBusy}
              onClick={() => {
                setMenuAnchor(null);
                setTurns([]);
                setError("");
              }}
            >
              <ListItemText>Clear conversation</ListItemText>
            </MenuItem>
          </Menu>
          <Popover
            anchorEl={chipAnchor}
            open={Boolean(chipAnchor)}
            onClose={() => setChipAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: {
                sx: {
                  p: 1.5,
                  maxWidth: 300,
                  border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
                },
              },
            }}
          >
            {target && (
              <>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: WORKSPACE_COLORS.aiText,
                  }}
                >
                  What is sent to {target.info.recipient}
                </Typography>
                <Typography sx={{ fontSize: 12.5, mt: 0.5 }}>
                  {target.info.isOnline
                    ? "Your message and the CV text, with employer and school names masked."
                    : `Nothing leaves this computer: ${target.info.label} runs here.`}
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    mt: 0.75,
                    color: WORKSPACE_COLORS.muted,
                  }}
                >
                  Never sent: your name or contact details.
                </Typography>
                <Typography
                  sx={{
                    fontSize: 12,
                    mt: 0.75,
                    color: WORKSPACE_COLORS.muted,
                  }}
                >
                  The conversation is kept in this browser only. Clear it in the
                  … menu.
                </Typography>
              </>
            )}
          </Popover>
        </Box>
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          {target && !target.isConfigured && (
            <Alert severity="info">
              No AI is set up for chat. Add a key or start Ollama (see AI
              setup).
            </Alert>
          )}
          {!isSaved && (
            <Alert severity="warning">
              The AI works on the saved CV. Save your changes first.
            </Alert>
          )}
          {turns.length === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.6,
                    color: WORKSPACE_COLORS.muted,
                    mb: 0.75,
                  }}
                >
                  TRY
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  {examples.map((example) => (
                    <ButtonBase
                      key={example}
                      onClick={() => setText(example)}
                      sx={{
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 4,
                        fontSize: 12.5,
                        color: WORKSPACE_COLORS.aiText,
                        border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
                        textAlign: "left",
                      }}
                    >
                      {example}
                    </ButtonBase>
                  ))}
                </Box>
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      color: WORKSPACE_COLORS.muted,
                      mb: 0.75,
                    }}
                  >
                    CHAT CAN
                  </Typography>
                  {CAN.map((line) => (
                    <Box
                      key={line}
                      sx={{ display: "flex", gap: 0.75, mb: 0.5 }}
                    >
                      <CheckOutlined
                        sx={{ fontSize: 16, mt: "2px", color: "success.main" }}
                      />
                      <Typography sx={{ fontSize: 12.5 }}>{line}</Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 0.6,
                      color: WORKSPACE_COLORS.muted,
                      mb: 0.75,
                    }}
                  >
                    CHAT CAN’T
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.75 }}>
                    <CloseOutlined
                      sx={{
                        fontSize: 16,
                        mt: "2px",
                        color: WORKSPACE_COLORS.muted,
                      }}
                    />
                    <Typography sx={{ fontSize: 12.5 }}>
                      Add or edit your facts. Use the Vault for that.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
          {turns.map((turn) => {
            const operations = turn.operations ?? [];
            const ticked = turn.selected?.filter(Boolean).length ?? 0;
            const isApplied = turn.appliedAtStep !== undefined;
            return (
              <Box
                key={turn.id}
                sx={{ display: "flex", flexDirection: "column", gap: 1 }}
              >
                <Box
                  sx={{
                    alignSelf: turn.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: turn.role === "user" ? "85%" : "100%",
                    px: 1.25,
                    py: 0.75,
                    borderRadius: 1.5,
                    bgcolor:
                      turn.role === "user"
                        ? WORKSPACE_COLORS.accentSoft
                        : WORKSPACE_COLORS.panelAlt,
                    fontSize: 13,
                  }}
                >
                  <Typography sx={{ fontSize: 13 }}>{turn.content}</Typography>
                  {turn.warnings?.map((warning) => (
                    <Typography
                      key={warning}
                      sx={{ fontSize: 11.5, color: "var(--wrt)", mt: 0.5 }}
                    >
                      {warning}
                    </Typography>
                  ))}
                </Box>
                {operations.length > 0 && (
                  <Box
                    sx={{
                      border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
                      borderRadius: 1.5,
                      overflow: "hidden",
                      bgcolor: WORKSPACE_COLORS.panel,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        px: 1.25,
                        py: 0.75,
                        bgcolor: WORKSPACE_COLORS.aiSoft,
                        color: WORKSPACE_COLORS.aiText,
                      }}
                    >
                      <AiIcon fontSize="small" />
                      <Typography
                        sx={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}
                      >
                        AI proposes {operations.length}{" "}
                        {operations.length === 1 ? "change" : "changes"}
                      </Typography>
                      <Typography sx={{ fontSize: 12 }}>
                        {isApplied ? "Applied" : "Nothing applied yet"}
                      </Typography>
                    </Box>
                    {operations.map((op, index) => (
                      <Box
                        key={index}
                        component="label"
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 1,
                          px: 1.25,
                          py: 1,
                          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
                          bgcolor: isFlagged(op)
                            ? WORKSPACE_COLORS.aiSoft
                            : "transparent",
                          cursor: isApplied ? "default" : "pointer",
                        }}
                      >
                        <Checkbox
                          size="small"
                          disabled={isApplied}
                          checked={turn.selected?.[index] ?? false}
                          onChange={(event) =>
                            toggle(turn, index, event.target.checked)
                          }
                          sx={{
                            p: 0,
                            mt: "1px",
                            "&.Mui-checked": { color: WORKSPACE_COLORS.ai },
                          }}
                        />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{ fontSize: 12.5, lineHeight: "20px" }}
                          >
                            {describeOperation(op, vault)}
                          </Typography>
                          {isFlagged(op) && op.op === "rewriteBullet" && (
                            <Box
                              sx={{
                                mt: 0.5,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.5,
                                px: 1,
                                py: 0.25,
                                borderRadius: 4,
                                fontSize: 11.5,
                                ...{
                                  bgcolor: "var(--wrs)",
                                  color: "var(--wrt)",
                                  border: "1px solid var(--wr)",
                                },
                              }}
                            >
                              <WarningAmberOutlined sx={{ fontSize: 14 }} />
                              Not ticked: {op.flags?.join("; ")}
                            </Box>
                          )}
                        </Box>
                      </Box>
                    ))}
                    {!isApplied && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          px: 1.25,
                          py: 1,
                          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
                        }}
                      >
                        <Typography
                          sx={{
                            flex: 1,
                            fontSize: 12.5,
                            color: WORKSPACE_COLORS.muted,
                          }}
                        >
                          {ticked} of {operations.length} ticked
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          onClick={() => dismiss(turn)}
                        >
                          Dismiss
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={ticked === 0}
                          onClick={() => apply(turn)}
                        >
                          Apply {ticked} selected
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
                {isApplied && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CheckOutlined
                      sx={{ fontSize: 16, color: "success.main" }}
                    />
                    <Typography
                      sx={{
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "success.main",
                      }}
                    >
                      Applied {turn.appliedCount}{" "}
                      {turn.appliedCount === 1 ? "change" : "changes"}
                    </Typography>
                    {steps === turn.appliedAtStep && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="inherit"
                        onClick={() => dispatch(undo())}
                      >
                        Undo
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
          {isBusy && <CircularProgress size={20} />}
          {error && <Alert severity="error">{error}</Alert>}
          <div ref={endRef} />
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
          }}
        >
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              multiline
              maxRows={4}
              placeholder="Ask for a change…"
              value={text}
              disabled={!canAsk}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              slotProps={{ htmlInput: { "aria-label": "Message" } }}
            />
            <AiButton
              variant="contained"
              disabled={!canAsk || isBusy || !text.trim()}
              onClick={() => void send()}
            >
              Send
            </AiButton>
          </Box>
          <Typography
            sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted, mt: 0.75 }}
          >
            Enter to send · Shift+Enter for a new line · Nothing changes until
            you apply.
          </Typography>
        </Box>
      </Box>
    </ResizableAside>
  );
}
