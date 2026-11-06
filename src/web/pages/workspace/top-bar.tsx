import { Box, Button, Chip, MenuItem, Select, Typography } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CheckIcon from "@mui/icons-material/Check";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { SaveStatus } from "@pages/editor-page/save-status";
import { MarkAsApplied } from "@pages/applications-page/mark-as-applied";
import { useDownloadPdf } from "@hooks/use-download-pdf";
import { activateVariant } from "@hooks/use-sync-active-variant";
import { setTool } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  variantsSelector,
} from "@store/variants/variants-slice";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/** The dark bar on top: variant, fit, save state and the main actions */
export function TopBar(): JSX.Element {
  const dispatch = useAppDispatch();
  const variants = useAppSelector(variantsSelector);
  const variant = useAppSelector(activeVariantSelector);
  const pageCount = useAppSelector((s) => s.app.pageCount);
  const { download, isBusy } = useDownloadPdf();
  const isFitting = pageCount <= variant.pageLimit;

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
          </MenuItem>
        ))}
      </Select>
      <Chip
        size="small"
        icon={isFitting ? <CheckIcon /> : <WarningAmberIcon />}
        label={
          isFitting
            ? `Fits ${variant.pageLimit} ${variant.pageLimit === 1 ? "page" : "pages"}`
            : `${pageCount} pages, limit ${variant.pageLimit}`
        }
        sx={{
          bgcolor: isFitting ? WORKSPACE_COLORS.okBg : WORKSPACE_COLORS.errBg,
          color: isFitting ? WORKSPACE_COLORS.okText : WORKSPACE_COLORS.errText,
          "& .MuiChip-icon": { color: "inherit" },
        }}
      />
      <Box sx={{ flex: 1 }} />
      <SaveStatus />
      <Button
        size="small"
        variant="contained"
        startIcon={<AutoAwesomeIcon />}
        onClick={() => dispatch(setTool("tailor"))}
        sx={{ bgcolor: "#6D3FC9", "&:hover": { bgcolor: "#5B33AB" } }}
      >
        Tailor to job ad
      </Button>
      <Button
        size="small"
        variant="outlined"
        disabled={isBusy}
        startIcon={<PictureAsPdfIcon />}
        onClick={() => void download("")}
        sx={{ borderColor: "rgba(255,255,255,.3)" }}
      >
        Export PDF
      </Button>
      <MarkAsApplied />
    </Box>
  );
}
