import { useEffect, useState } from "react";
import { useViewport } from "@hooks/use-viewport";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@components/ui";
import { CloseOutlined as CloseOutlinedIcon } from "@components/ui/icons";
import { AiButton } from "@components/ai-button";
import {
  AiInfoButton,
  AiSettingsButton,
  jobLabelOf,
} from "@pages/workspace/ai-job-context";
import {
  RequirementsTable,
  groupsOfRequirements,
} from "@pages/workspace/requirements-table";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { activeJobSelector } from "@store/jobs/jobs-slice";
import { useAppSelector } from "@store/store-helper";

/** What the job asks for, in the three groups of the advert analysis (a tailored job has no keywords) */
function useRequirementGroups(): {
  title: string;
  list: string[];
}[] {
  const job = useAppSelector(activeJobSelector);
  const analysis = job.analysis;
  if (job.tailor) {
    return groupsOfRequirements(job.tailor.requirements);
  }
  return groupsOfRequirements(
    analysis ?? { mustHave: [], niceToHave: [], keywords: [] }
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** What is reworded: the bullets of this entry, or its text */
  target: "bullets" | "text";
  /** The points already picked */
  initial?: string[];
  /** The confirm button: "Emphasise" asks the AI at once; any other label only keeps the picks */
  confirmLabel?: string;
  /** Called with the clicked points when the user confirms */
  onConfirm: (selected: string[]) => void;
}

/**
 * Pick what to emphasise: the job's must-haves, nice-to-haves and keywords side by side; a click
 * selects or unselects one. "Emphasise" then asks the AI to word the bullets (or the text) so the
 * selected points come first, only where they already say it.
 */
export function EmphasiseDialog({
  isOpen,
  onClose,
  target,
  initial = [],
  confirmLabel = "Use these points",
  onConfirm,
}: Props): JSX.Element {
  const isPhone = useViewport() === "phone";
  const job = useAppSelector(activeJobSelector);
  const groups = useRequirementGroups();
  const isAi = confirmLabel === "Emphasise";
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelected(initial);
    }
    // only when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function toggle(text: string): void {
    setSelected((current) =>
      current.includes(text)
        ? current.filter((entry) => entry !== text)
        : [...current, text]
    );
  }

  function setMany(texts: string[], isOn: boolean): void {
    setSelected((current) =>
      isOn
        ? [...current, ...texts.filter((text) => !current.includes(text))]
        : current.filter((text) => !texts.includes(text))
    );
  }

  const count = selected.length;
  const confirm = (): void => {
    onConfirm(selected);
    onClose();
  };
  const what = target === "bullets" ? "the bullets" : "this text";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      fullScreen={isPhone}
      maxWidth="lg"
      aria-labelledby="emphasise-title"
    >
      <DialogTitle
        id="emphasise-title"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontSize: 16,
          fontWeight: 600,
          borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        What should {what} lean on?
        <AiInfoButton hasEntry />
        <AiSettingsButton task="chat" />
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          {jobLabelOf(job)}
        </Typography>
        <IconButton size="small" aria-label="Close" onClick={onClose}>
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: WORKSPACE_COLORS.aiSoft,
          borderBottom: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
        }}
      >
        <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.aiText }}>
          Tick the points of{" "}
          <Box component="strong" sx={{ fontWeight: 700 }}>
            {jobLabelOf(job)}
          </Box>{" "}
          {isAi ? (
            <>
              to emphasise. AI will move them to the front of {what}, but only
              if the text already mentions them; it never adds anything new. You
              always see the result first and choose whether to use it.
            </>
          ) : (
            <>
              {`${target === "bullets" ? "this entry" : "this text"} should highlight. AI will move them to the front, but only if your text already mentions them; it never adds anything new.`}
              <br />
              You can skip this: with nothing ticked, AI considers all of the
              job’s requirements equally. You always see the result first and
              choose whether to use it.
            </>
          )}
        </Typography>
      </Box>
      <DialogContent>
        <RequirementsTable
          groups={groups}
          selected={selected}
          onToggle={toggle}
          onSetMany={setMany}
        />
      </DialogContent>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
          bgcolor: WORKSPACE_COLORS.panelAlt,
        }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
          {count} ticked
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            flex: 1,
            minWidth: 0,
            maxHeight: 76,
            overflowY: "auto",
          }}
        >
          {selected.map((text) => (
            <Chip
              key={text}
              size="small"
              color="secondary"
              label={text}
              onDelete={() => toggle(text)}
              sx={{ maxWidth: 280 }}
            />
          ))}
        </Box>
        <Button
          color="neutral"
          disabled={count === 0}
          onClick={() => setSelected([])}
        >
          Clear
        </Button>
        <Button onClick={onClose}>Cancel</Button>
        {isAi ? (
          <AiButton
            variant="contained"
            disabled={count === 0}
            onClick={confirm}
          >
            {confirmLabel}
          </AiButton>
        ) : (
          <Button variant="contained" color="secondary" onClick={confirm}>
            {count === 0
              ? "Use the whole advert"
              : `Use ${count} ${count === 1 ? "point" : "points"}`}
          </Button>
        )}
      </Box>
      {!isAi && (
        <Typography
          sx={{
            px: 2.5,
            pb: 1.5,
            fontSize: 12,
            color: WORKSPACE_COLORS.muted,
            bgcolor: WORKSPACE_COLORS.panelAlt,
          }}
        >
          After this, choose Shorten, Rephrase, Make longer or Make bullets.
          Each one uses the ticked points (Shorten keeps them).
        </Typography>
      )}
    </Dialog>
  );
}
