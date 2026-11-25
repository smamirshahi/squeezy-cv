import { DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useViewport } from "@hooks/use-viewport";
import { notify } from "@components/notifications/notify";
import { undo } from "@store/history/history";
import { clearRecentImport, setRecentImport } from "@store/vault/recent-import";
import { estimateRequestCost, costHeadline } from "@shared/ai/pricing";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Tooltip,
  Typography,
} from "@components/ui";
import {
  AddOutlined as AddOutlinedIcon,
  SettingsOutlined,
} from "@components/ui/icons";
import {
  MAX_IMPORT_LENGTH,
  MAX_IMPORT_PDF_BYTES,
} from "@custom-types/import-types";
import {
  DescriptionLine,
  ImportSource,
  MergePlan,
  applyPlan,
  isPlanResolved,
  planImports,
  setDescriptionLines,
  unresolvedCount,
} from "@shared/vault/merge-imports";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { Vault } from "@custom-types/vault-types";
import { setVault, vaultSelector } from "@store/vault/vault-slice";
import { AiButton, AiIcon } from "@components/ai-button";
import {
  onAiSettingsChanged,
  openAiSettings,
} from "@pages/workspace/ai-settings-event";
import { ImportReview } from "@pages/workspace/import-review";
import { withOneApproval, withSendSubject } from "@store/persistence/send-gate";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/** One PDF in the list: its text is read first, then it is analysed together with the others */
interface PdfEntry {
  id: string;
  name: string;
  status: "reading" | "ready" | "failed";
  text: string;
  error?: string;
}

const PASTED_NAME = "Pasted text";

/** Marks a source the AI has already sorted (AI colours, with the AI icon) */
function AnalyzedBadge(): JSX.Element {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
        bgcolor: WORKSPACE_COLORS.aiSoft,
        color: WORKSPACE_COLORS.aiText,
        fontSize: "0.8125rem",
        fontWeight: 600,
      }}
    >
      <AiIcon />
      Analyzed
    </Box>
  );
}

/** The answer for one source, valid only for the exact text it was made from */
interface Analysed {
  text: string;
  vault: Vault;
  warnings: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * "Paste CV text, AI sorts it": the AI sorts the pasted text into profile, links and
 * sections; the user reviews what it found (and what looks invented), then adds it to the
 * vault. Nothing is saved until the user presses Save.
 */
export function ImportCvDialog({ isOpen, onClose }: Props): JSX.Element {
  const isPhone = useViewport() === "phone";
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const api = useMemo(() => createApiClient(), []);
  const [text, setText] = useState<string>("");
  const [isBusy, setIsBusy] = useState<boolean>(false);
  /** What the AI is doing right now (shown next to the spinner) */
  const [progress, setProgress] = useState<string>("");
  /** Which source the AI is on, and which are finished (ids of the PDF rows) */
  const [current, setCurrent] = useState<string>("");
  /** What the AI already returned per source, kept when the run is cancelled so it is not sent twice */
  const [analysed, setAnalysed] = useState<Record<string, Analysed>>({});
  /** Rows the user removed while the AI was still working through the list */
  const removedWhileBusy = useRef<Set<string>>(new Set());
  const [error, setError] = useState<string>("");
  const [files, setFiles] = useState<PdfEntry[]>([]);
  const [plan, setPlan] = useState<MergePlan | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const target = status ? taskProvider(status, "import") : null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const load = (): void => {
      api
        .getAiStatus()
        .then(setStatus)
        .catch(() => setStatus(null));
    };
    load();
    // Change AI opens the settings dialog on top of this one: read the choice again when it closes
    return onAiSettingsChanged(load);
  }, [isOpen, api]);

  /** Reads each PDF's text (on the local server, or in the browser version on this device) and lists it */
  async function readPdfs(picked: File[]): Promise<void> {
    setError("");
    setPlan(null);
    for (const file of picked) {
      const id = crypto.randomUUID();
      if (file.size > MAX_IMPORT_PDF_BYTES) {
        setFiles((list) => [
          ...list,
          {
            id,
            name: file.name,
            status: "failed",
            text: "",
            error: `Larger than ${MAX_IMPORT_PDF_BYTES / (1024 * 1024)} MB.`,
          },
        ]);
        continue;
      }
      setFiles((list) => [
        ...list,
        { id, name: file.name, status: "reading", text: "" },
      ]);
      try {
        const read = await api.extractPdfText(file);
        setFiles((list) =>
          list.map((entry) =>
            entry.id === id
              ? { ...entry, status: "ready", text: read.text }
              : entry
          )
        );
      } catch (caught) {
        setFiles((list) =>
          list.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  status: "failed",
                  error:
                    caught instanceof ApiError || caught instanceof Error
                      ? caught.message
                      : "The PDF could not be read.",
                }
              : entry
          )
        );
      }
    }
  }

  function onDrop(event: DragEvent): void {
    event.preventDefault();
    setIsDragging(false);
    void readPdfs([...event.dataTransfer.files]);
  }

  /** Every readable text: the PDFs that were read and the pasted text */
  const documents = [
    ...files
      .filter((entry) => entry.status === "ready")
      .map((entry) => ({ id: entry.id, name: entry.name, text: entry.text })),
    ...(text.trim() ? [{ id: "pasted", name: PASTED_NAME, text }] : []),
  ];
  const totalLength = documents.reduce((sum, d) => sum + d.text.length, 0);

  async function analyse(): Promise<void> {
    setIsBusy(true);
    setError("");
    setPlan(null);
    setCurrent("");
    removedWhileBusy.current = new Set();
    const results = { ...analysed };
    try {
      // One Send to AI window for every file that still has to be sent: it lists them all and
      // one approval covers the run (the window is not opened again for each file)
      const toSend = documents.filter(
        (document) => results[document.id]?.text !== document.text
      );
      const collect = async (): Promise<{
        sources: ImportSource[];
        notes: string[];
      }> => {
        const found: ImportSource[] = [];
        const remarks: string[] = [];
        let position = 0;
        for (const document of documents) {
          if (removedWhileBusy.current.has(document.id)) {
            continue;
          }
          position += 1;
          const total = documents.filter(
            (one) => !removedWhileBusy.current.has(one.id)
          ).length;
          let answer = results[document.id];
          if (answer?.text !== document.text) {
            setCurrent(document.id);
            setProgress(
              total === 1
                ? `The AI is sorting ${document.name} into vault sections. This takes a few seconds.`
                : `The AI is reading ${document.name} (${position} of ${total}). Each file takes a few seconds.`
            );
            const imported = await api.importCv(document.text);
            answer = {
              text: document.text,
              vault: imported.vault,
              warnings: imported.warnings,
            };
            results[document.id] = answer;
            setAnalysed((list) => ({ ...list, [document.id]: answer }));
          }
          if (removedWhileBusy.current.has(document.id)) {
            continue;
          }
          found.push({ fileName: document.name, vault: answer.vault });
          remarks.push(
            ...answer.warnings.map((warning) => `${document.name}: ${warning}`)
          );
        }
        return { sources: found, notes: remarks };
      };
      const { sources, notes } =
        toSend.length === 0
          ? await collect()
          : await withSendSubject(
              toSend.length === 1
                ? `“${toSend[0].name}”`
                : `${toSend.length} files`,
              () =>
                withOneApproval(
                  toSend.map((document) => ({
                    url: "/api/ai/import",
                    body: { text: document.text },
                  })),
                  collect
                )
            );
      if (sources.length === 0) {
        throw new Error("Nothing is left to analyze.");
      }
      setProgress("Combining the results and looking for conflicts…");
      const next = planImports(vault, sources, () => crypto.randomUUID());
      setPlan(next);
      setWarnings(notes);
      setChecked(new Set(next.proposals.map((proposal) => proposal.id)));
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.code === "cancelled"
          ? "Cancelled. Nothing more was sent. Files already analyzed are kept; change the list or the text and press Analyze again."
          : caught instanceof ApiError || caught instanceof Error
            ? caught.message
            : "The AI request failed."
      );
    } finally {
      setIsBusy(false);
      setProgress("");
      setCurrent("");
    }
  }

  function toggle(id: string): void {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  /** Records the user's choice for one conflict ("profile" or a proposal id) */
  function choose(target: string, field: string, value: string): void {
    setPlan((current) =>
      current
        ? target === "profile"
          ? {
              ...current,
              profileConflicts: current.profileConflicts.map((conflict) =>
                conflict.field === field
                  ? { ...conflict, chosen: value }
                  : conflict
              ),
            }
          : {
              ...current,
              proposals: current.proposals.map((proposal) =>
                proposal.id === target
                  ? {
                      ...proposal,
                      conflicts: proposal.conflicts.map((conflict) =>
                        conflict.field === field
                          ? { ...conflict, chosen: value }
                          : conflict
                      ),
                    }
                  : proposal
              ),
            }
        : current
    );
  }

  function setAddOthers(value: boolean): void {
    setPlan((current) =>
      current
        ? {
            ...current,
            profileConflicts: current.profileConflicts.map((conflict) =>
              conflict.field === "headline"
                ? { ...conflict, addOthers: value }
                : conflict
            ),
          }
        : current
    );
  }

  function setLines(proposalId: string, lines: DescriptionLine[]): void {
    setPlan((current) =>
      current ? setDescriptionLines(current, proposalId, lines) : current
    );
  }

  /** Unticks the items that still have a conflict nobody settled */
  function untickUndecided(): void {
    if (!plan) {
      return;
    }
    const undecided = new Set(
      plan.proposals
        .filter((proposal) =>
          proposal.conflicts.some((conflict) => conflict.chosen === undefined)
        )
        .map((proposal) => proposal.id)
    );
    setChecked(
      (current) => new Set([...current].filter((id) => !undecided.has(id)))
    );
  }

  function add(): void {
    if (!plan) {
      return;
    }
    const result = applyPlan(vault, plan, checked, () => crypto.randomUUID());
    const recent: Record<string, { added: number; updated: number }> = {};
    let added = 0;
    let updated = 0;
    for (const proposal of plan.proposals.filter((p) => checked.has(p.id))) {
      const home = result.sections.find((s) => s.type === proposal.sectionType);
      if (!home) {
        continue;
      }
      const entry = recent[home.id] ?? { added: 0, updated: 0 };
      if (proposal.kind === "update") {
        entry.updated += 1;
        updated += 1;
      } else {
        entry.added += 1;
        added += 1;
      }
      recent[home.id] = entry;
    }
    dispatch(setVault(result));
    setRecentImport(recent);
    notify({
      kind: "undo",
      text: `${added} ${added === 1 ? "item" : "items"} added, ${updated} updated.`,
      action: {
        label: "Undo import",
        onClick: () => {
          dispatch(undo());
          clearRecentImport();
        },
      },
    });
    setPlan(null);
    setFiles([]);
    setText("");
    onClose();
  }

  /** Sources the AI has not answered yet (the cost is only for these) */
  const pending = documents.filter(
    (document) => analysed[document.id]?.text !== document.text
  );

  /** What analysing the remaining sources will probably cost (one request per source) */
  const estimate =
    target && status && pending.length > 0
      ? estimateRequestCost(
          status.choice?.import ?? status.provider,
          status.usedModels?.import,
          pending.map((document) => ({
            promptName: "import-cv",
            system: "",
            input: document.text,
          }))
        )
      : null;
  let costNote = "";
  if (estimate?.kind === "free") {
    costNote = "Free: the AI runs on this computer.";
  } else if (estimate?.kind === "priced") {
    const { main, upTo } = costHeadline(estimate.lowUsd, estimate.highUsd);
    costNote = `Estimated AI cost for ${pending.length === documents.length ? "all " : "the remaining "}${pending.length} ${pending.length === 1 ? "source" : "sources"} together: about ${main}${upTo ? `, up to ${upTo}` : ""}.`;
  }

  /** Why "Analyze with AI" cannot be pressed (empty = it can) */
  const analyseBlockedReason = isBusy
    ? "The AI is working on it."
    : !target?.isConfigured
      ? "AI is not set up yet (see the note above)."
      : files.some((entry) => entry.status === "reading")
        ? "Still reading the PDFs."
        : documents.length === 0
          ? "Paste your CV text or choose one or more PDFs first."
          : totalLength > MAX_IMPORT_LENGTH * Math.max(1, documents.length)
            ? `A text is longer than ${MAX_IMPORT_LENGTH} characters; shorten it.`
            : documents.some((d) => d.text.length > MAX_IMPORT_LENGTH)
              ? `A text is longer than ${MAX_IMPORT_LENGTH} characters; shorten it.`
              : "";
  /** Why "Add to my vault" cannot be pressed (empty = it can) */
  const addBlockedReason = !plan
    ? "Press Analyze with AI first; you can then check what it found before adding it."
    : isPlanResolved(plan, checked)
      ? ""
      : "Choose a value for every conflict (or untick that item) first.";
  const nextStep = plan
    ? "Step 3 of 3: check what was found, settle conflicts, then add it to your vault."
    : documents.length === 0
      ? "Step 1 of 3: paste your CV text or choose one or more PDFs."
      : "Step 2 of 3: press Analyze with AI.";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth={plan ? "lg" : "md"}
      fullWidth
      fullScreen={isPhone}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        Paste CV text, AI sorts it
        <Tooltip
          title="Beta: this works, but it is still being improved. Check what it found before you add it."
          arrow
        >
          <Chip size="small" color="warning" label="BETA" />
        </Tooltip>
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {!plan && (
          <>
            <Box
              component="section"
              aria-label="AI for sorting the CV text"
              sx={{
                display: "grid",
                gap: 1,
                p: 1.5,
                border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
                borderRadius: 1.5,
                bgcolor: WORKSPACE_COLORS.aiSoft,
                color: WORKSPACE_COLORS.aiText,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <AiIcon />
                <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
                  {target
                    ? `${target.info.label} · ${target.info.isOnline ? "online" : "on this computer"}`
                    : "AI"}
                </Typography>
                <Button
                  size="small"
                  color="secondary"
                  startIcon={<SettingsOutlined fontSize="small" />}
                  onClick={() => openAiSettings("import")}
                >
                  Change AI
                </Button>
              </Box>
              <Typography variant="body2">
                {target && !target.info.isOnline
                  ? `The text stays on this computer (${target.info.label}).`
                  : `The whole text you paste or take from a PDF, including your name and contact details, is sent to ${target?.info.recipient ?? "the AI provider"}. Choose an offline provider with Change AI if you do not want that.`}
              </Typography>
              {target && !target.isConfigured && (
                <Alert severity="info">
                  {target.info.label} is not set up. Choose another AI with
                  Change AI, or set it up (see Settings), then try again.
                </Alert>
              )}
            </Box>
            <Box
              role="button"
              tabIndex={0}
              aria-label="Choose PDF files, or drop them here"
              aria-disabled={false}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  fileInput.current?.click();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                width: "100%",
                px: 2,
                py: 2.5,
                textAlign: "center",
                cursor: "pointer",
                border: "2px dashed",
                borderColor: isDragging ? "primary.main" : "divider",
                bgcolor: isDragging ? "action.hover" : "transparent",
                borderRadius: 1,
                "&:hover, &:focus-visible": {
                  borderColor: "primary.main",
                  bgcolor: "action.hover",
                },
              }}
            >
              <AddOutlinedIcon color="primary" sx={{ fontSize: 32 }} />
              <Typography sx={{ fontWeight: "bold" }}>
                Click to choose PDFs (several are fine), or drop them here
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Old CV versions, a LinkedIn profile saved as PDF (More &gt; Save
                to PDF) and so on. They are combined; you settle any conflict
                before anything is saved. Scanned PDFs (images) are not
                supported.
              </Typography>
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                hidden
                aria-label="PDF file"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  const picked = [...(event.target.files ?? [])];
                  event.target.value = "";
                  void readPdfs(picked);
                }}
              />
            </Box>
            {files.map((entry) => (
              <Box
                key={entry.id}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {entry.name}:{" "}
                  {entry.status === "reading"
                    ? "reading…"
                    : entry.status === "failed"
                      ? `failed (${entry.error})`
                      : `read (${entry.text.length} characters)`}
                </Typography>
                {!isBusy && analysed[entry.id]?.text === entry.text && (
                  <AnalyzedBadge />
                )}
                {entry.status === "reading" && <CircularProgress size={16} />}
                {isBusy &&
                entry.status === "ready" &&
                (analysed[entry.id]?.text === entry.text ||
                  current === entry.id) ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      minWidth: 130,
                      justifyContent: "flex-end",
                    }}
                  >
                    {current === entry.id ? (
                      <>
                        <CircularProgress size={16} />
                        <Typography variant="body2" color="text.secondary">
                          Analyzing…
                        </Typography>
                      </>
                    ) : (
                      <AnalyzedBadge />
                    )}
                  </Box>
                ) : (
                  <>
                    {isBusy && entry.status === "ready" && (
                      <Typography variant="body2" color="text.secondary">
                        Waiting
                      </Typography>
                    )}
                    <Button
                      size="small"
                      onClick={() => {
                        setPlan(null);
                        removedWhileBusy.current.add(entry.id);
                        setAnalysed((list) => {
                          const { [entry.id]: _removed, ...rest } = list;
                          return rest;
                        });
                        setFiles((list) =>
                          list.filter((one) => one.id !== entry.id)
                        );
                      }}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </Box>
            ))}
            <TextField
              label="Or paste CV text"
              multiline
              minRows={8}
              maxRows={14}
              value={text}
              onChange={(event) => setText(event.target.value)}
              helperText={`${text.length} / ${MAX_IMPORT_LENGTH} characters. Messy is fine.`}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </>
        )}
        {plan && (
          <>
            {warnings.map((warning) => (
              <Alert key={warning} severity="warning">
                {warning}
              </Alert>
            ))}
            <ImportReview
              plan={plan}
              checked={checked}
              onToggle={toggle}
              onChoose={choose}
              onAddOthers={setAddOthers}
              onLines={setLines}
            />
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: "wrap" }}>
        {plan ? (
          <>
            <Button onClick={() => setPlan(null)}>Back</Button>
            <Typography variant="body2" sx={{ flex: 1 }} aria-live="polite">
              <b>
                {checked.size} of {plan.proposals.length} selected
              </b>
              {unresolvedCount(plan, checked) > 0 &&
                ` · ${unresolvedCount(plan, checked)} conflicts left`}
              {
                " · Nothing is saved until you press the button. You can undo it after."
              }
            </Typography>
            {unresolvedCount(plan, checked) > 0 && (
              <Tooltip
                title="Leaves out every item that still has an open conflict, so you can add the rest now"
                arrow
              >
                <Button size="small" onClick={untickUndecided}>
                  Skip the undecided items
                </Button>
              </Tooltip>
            )}
            <Button onClick={onClose}>Cancel</Button>
            <Tooltip title={addBlockedReason} arrow>
              <span>
                <Button
                  variant="contained"
                  disabled={addBlockedReason !== ""}
                  onClick={add}
                >
                  Add to my vault
                </Button>
              </span>
            </Tooltip>
          </>
        ) : (
          <>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ flex: 1 }}
              aria-live="polite"
            >
              {isBusy ? progress : nextStep}
              {!isBusy && costNote ? ` ${costNote}` : ""}
            </Typography>
            <Button onClick={onClose}>Cancel</Button>
            <Tooltip title={analyseBlockedReason} arrow>
              <span>
                <AiButton
                  variant="contained"
                  disabled={analyseBlockedReason !== ""}
                  onClick={() => void analyse()}
                >
                  Analyze with AI
                </AiButton>
              </span>
            </Tooltip>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
