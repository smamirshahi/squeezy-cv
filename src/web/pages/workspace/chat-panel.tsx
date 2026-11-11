import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";
import { Operation } from "@custom-types/chat-types";
import { buildChatContext } from "@shared/chat/chat-context";
import { describeOperation } from "@shared/chat/describe-operation";
import { shorten } from "@shared/variant/item-label";
import { Turn, loadChat, saveChat } from "@pages/workspace/chat-memory";
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
import { AiButton } from "@components/ai-button";

const MAX_SENT_TURNS = 6;

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
  return (
    <ResizableAside side="right" label="the chat panel" defaultWidth={360}>
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
        }}
      >
        <Box
          sx={{ p: 1.5, borderBottom: `1px solid ${WORKSPACE_COLORS.border}` }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography sx={{ fontWeight: 700, flex: 1 }}>Chat</Typography>
            {turns.length > 0 && (
              <Button
                size="small"
                disabled={isBusy}
                onClick={() => {
                  setTurns([]);
                  setError("");
                }}
              >
                Clear conversation
              </Button>
            )}
          </Box>
          <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
            Ask for changes to “{variant.name}”. You approve each one; Undo
            brings it back. The conversation is kept in this browser only.
          </Typography>
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
          {target && (
            <Typography sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted }}>
              {target.info.isOnline
                ? `Your message and the CV text (not your name or contact details) go to ${target.info.recipient}.`
                : `Using ${target.info.label} on this computer: nothing leaves it.`}
            </Typography>
          )}
          {turns.length === 0 && (
            <Typography sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}>
              Try: “Hide the oldest job”, “Put Skills first”, “Make the tone
              more formal”, “Shorten the first bullet of my current role”.
            </Typography>
          )}
          {turns.map((turn) => (
            <Box
              key={turn.id}
              sx={{
                alignSelf: turn.role === "user" ? "flex-end" : "stretch",
                maxWidth: turn.role === "user" ? "85%" : "100%",
                p: 1,
                borderRadius: 1.5,
                bgcolor:
                  turn.role === "user"
                    ? WORKSPACE_COLORS.accentSoft
                    : WORKSPACE_COLORS.panelAlt,
                fontSize: 13,
              }}
            >
              <Typography sx={{ fontSize: 13 }}>{turn.content}</Typography>
              {turn.operations && turn.operations.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  {turn.operations.map((op, index) => (
                    <Box key={index}>
                      <FormControlLabel
                        sx={{ m: 0, alignItems: "flex-start" }}
                        disabled={turn.appliedAtStep !== undefined}
                        control={
                          <Checkbox
                            size="small"
                            checked={turn.selected?.[index] ?? false}
                            onChange={(event) =>
                              setTurns((current) =>
                                current.map((t) =>
                                  t.id === turn.id
                                    ? {
                                        ...t,
                                        selected: t.selected?.map((value, i) =>
                                          i === index
                                            ? event.target.checked
                                            : value
                                        ),
                                      }
                                    : t
                                )
                              )
                            }
                          />
                        }
                        label={
                          <Typography sx={{ fontSize: 12.5 }}>
                            {describeOperation(op, vault)}
                          </Typography>
                        }
                      />
                      {isFlagged(op) && op.op === "rewriteBullet" && (
                        <Alert severity="error" sx={{ py: 0, my: 0.5 }}>
                          Check this one, not ticked automatically:{" "}
                          {op.flags?.join("; ")}.
                        </Alert>
                      )}
                    </Box>
                  ))}
                  {turn.appliedAtStep === undefined ? (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={!turn.selected?.some(Boolean)}
                      onClick={() => apply(turn)}
                    >
                      Apply {turn.selected?.filter(Boolean).length ?? 0}{" "}
                      selected
                    </Button>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography sx={{ fontSize: 12.5 }}>
                        Applied {turn.appliedCount}{" "}
                        {turn.appliedCount === 1 ? "change" : "changes"}.
                      </Typography>
                      {steps === turn.appliedAtStep && (
                        <Button size="small" onClick={() => dispatch(undo())}>
                          Undo
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>
              )}
              {turn.warnings?.map((warning) => (
                <Typography
                  key={warning}
                  sx={{ fontSize: 11.5, color: "var(--wrt)", mt: 0.5 }}
                >
                  {warning}
                </Typography>
              ))}
            </Box>
          ))}
          {isBusy && <CircularProgress size={20} />}
          {error && <Alert severity="error">{error}</Alert>}
          <div ref={endRef} />
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
            display: "flex",
            gap: 1,
          }}
        >
          <TextField
            size="small"
            fullWidth
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
      </Box>
    </ResizableAside>
  );
}
