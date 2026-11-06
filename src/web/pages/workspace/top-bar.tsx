import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import RedoIcon from "@mui/icons-material/Redo";
import UndoIcon from "@mui/icons-material/Undo";
import { redo, undo } from "@store/history/history";
import { describeLock } from "@shared/variant/variant-lock";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { SaveStatus } from "@pages/editor-page/save-status";
import { MarkAsApplied } from "@pages/applications-page/mark-as-applied";
import { useState } from "react";
import { ExportDialog } from "@pages/workspace/export-dialog";
import { activateVariant } from "@hooks/use-sync-active-variant";
import { setTool } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  variantsSelector,
} from "@store/variants/variants-slice";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/** Label of a history step for a tooltip: the action name without its slice prefix */
function stepLabel(type: string | undefined): string {
  return type ? type.replace(/^[a-z]+\//, "") : "";
}

/** Undo and redo for every edit (manual or by the chat) since the file was loaded */
function UndoRedo(): JSX.Element {
  const dispatch = useAppDispatch();
  const { past, future } = useAppSelector((s) => s.history);
  return (
    <Box sx={{ display: "flex", gap: 0.25 }}>
      <Tooltip
        title={
          past.length > 0
            ? `Undo ${stepLabel(past.at(-1)?.type)} (⌘Z)`
            : "Nothing to undo"
        }
      >
        <span>
          <IconButton
            size="small"
            aria-label="Undo"
            disabled={past.length === 0}
            onClick={() => dispatch(undo())}
            sx={{
              color: WORKSPACE_COLORS.barText,
              "&.Mui-disabled": {
                opacity: 0.35,
                color: WORKSPACE_COLORS.barText,
              },
            }}
          >
            <UndoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip
        title={
          future.length > 0
            ? `Redo ${stepLabel(future[0]?.type)} (⇧⌘Z)`
            : "Nothing to redo"
        }
      >
        <span>
          <IconButton
            size="small"
            aria-label="Redo"
            disabled={future.length === 0}
            onClick={() => dispatch(redo())}
            sx={{
              color: WORKSPACE_COLORS.barText,
              "&.Mui-disabled": {
                opacity: 0.35,
                color: WORKSPACE_COLORS.barText,
              },
            }}
          >
            <RedoIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

/** The dark bar on top: variant, fit, save state and the main actions */
export function TopBar(): JSX.Element {
  const dispatch = useAppDispatch();
  const variants = useAppSelector(variantsSelector);
  const variant = useAppSelector(activeVariantSelector);
  const locks = useAppSelector((s) => s.variants.locks);
  const { pageCount, usedPercent, linesOver } = useAppSelector(
    (s) => s.app.fit
  );
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const isFitting = pageCount <= variant.pageLimit && linesOver === 0;

  return (
    <Box
      component="header"
      sx={{
        height: 48,
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        bgcolor: WORKSPACE_COLORS.bar,
        color: WORKSPACE_COLORS.barText,
        "& .MuiButton-root": { color: WORKSPACE_COLORS.barText },
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: 14, mr: 0.5 }}>
        CV Builder
      </Typography>
      <Select
        size="small"
        value={variant.id}
        aria-label="Switch variant"
        onChange={(event) => {
          const next = variants.find((v) => v.id === event.target.value);
          if (next) {
            activateVariant(dispatch, next);
          }
        }}
        sx={{
          color: WORKSPACE_COLORS.barText,
          height: 32,
          minWidth: 200,
          fontSize: 13,
          "& fieldset": { borderColor: "rgba(255,255,255,.25)" },
          "& svg": { color: WORKSPACE_COLORS.barText },
        }}
      >
        {variants.map((v) => (
          <MenuItem key={v.id} value={v.id}>
            {v.name}
            {describeLock(locks, v.id) && (
              <Tooltip title={describeLock(locks, v.id)}>
                <LockIcon
                  fontSize="inherit"
                  aria-label={describeLock(locks, v.id)}
                  sx={{ ml: 1, opacity: 0.7 }}
                />
              </Tooltip>
            )}
          </MenuItem>
        ))}
      </Select>
      <Chip
        size="small"
        icon={isFitting ? <CheckIcon /> : <WarningAmberIcon />}
        label={
          isFitting
            ? `Fits ${variant.pageLimit} ${variant.pageLimit === 1 ? "page" : "pages"} · ${usedPercent}%`
            : `${linesOver} ${linesOver === 1 ? "line" : "lines"} over ${variant.pageLimit} ${variant.pageLimit === 1 ? "page" : "pages"}`
        }
        sx={{
          bgcolor: isFitting ? WORKSPACE_COLORS.okBg : WORKSPACE_COLORS.errBg,
          color: isFitting ? WORKSPACE_COLORS.okText : WORKSPACE_COLORS.errText,
          "& .MuiChip-icon": { color: "inherit" },
        }}
      />
      <Box sx={{ flex: 1 }} />
      <UndoRedo />
      <SaveStatus />
      <Button
        size="small"
        variant="contained"
        startIcon={<AutoAwesomeIcon />}
        onClick={() => dispatch(setTool("tailor"))}
        sx={{
          bgcolor: WORKSPACE_COLORS.ai,
          color: WORKSPACE_COLORS.aiContrast,
          "&:hover": {
            bgcolor: WORKSPACE_COLORS.ai,
            filter: "brightness(.92)",
          },
        }}
      >
        Tailor to job ad
      </Button>
      <Button
        size="small"
        variant="outlined"
        startIcon={<PictureAsPdfIcon />}
        onClick={() => setIsExportOpen(true)}
        sx={{ borderColor: "rgba(255,255,255,.3)" }}
      >
        Export PDF
      </Button>
      <MarkAsApplied />
      <ExportDialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </Box>
  );
}
