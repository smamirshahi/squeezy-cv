import { LockedFieldset } from "@pages/workspace/variant-lock";
import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { FitMode } from "@custom-types/variant-types";
import { activateVariant } from "@hooks/use-sync-active-variant";
import { VariantSectionItems } from "@pages/editor-page/sections/variant-section-items";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  addVariant,
  deleteVariant,
  duplicateVariant,
  renameVariant,
  setAutoFit,
  setPageLimit,
  variantsSelector,
} from "@store/variants/variants-slice";
import { sectionsSelector, vaultSelector } from "@store/vault/vault-slice";

/**
 * Creates, switches, renames and deletes variants, and chooses per variant which items
 * and bullets are shown, in which order and wording. Changes apply at once and never
 * change the vault.
 */
export function EditorVariants(): JSX.Element {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const sections = useAppSelector(sectionsSelector);
  const variants = useAppSelector(variantsSelector);
  const variant = useAppSelector(activeVariantSelector);
  const style = useAppSelector(styleSelector);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  function handleSwitch(id: string): void {
    const next = variants.find((v) => v.id === id);
    if (next) {
      activateVariant(dispatch, next);
    }
  }

  function handleNew(): void {
    // The new variant starts from the layout and style the editor shows now
    dispatch(
      addVariant({ vault, style, name: `Variant ${variants.length + 1}` })
    );
  }

  function handleDuplicate(): void {
    // The copy has the same layout and style, so the editor already shows them
    dispatch(duplicateVariant({ sourceId: variant.id }));
  }

  return (
    <LockedFieldset>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Variants
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        A variant is one version of your CV for one purpose. Hiding or
        reordering here only changes the variant, never your data. Changes apply
        at once.
      </Typography>

      <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
        <TextField
          select
          label="Active variant"
          value={variant.id}
          onChange={(event) => handleSwitch(event.target.value)}
          sx={{ minWidth: 220 }}
        >
          {variants.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {v.name || "(unnamed)"}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Variant name"
          value={variant.name}
          onChange={(event) =>
            dispatch(
              renameVariant({ id: variant.id, name: event.target.value })
            )
          }
          sx={{ flexGrow: 1 }}
        />
        <Button onClick={handleNew}>New</Button>
        <Button onClick={handleDuplicate}>Duplicate</Button>
        <Button
          color="error"
          disabled={variants.length <= 1}
          onClick={() => setIsDeleting(true)}
        >
          Delete
        </Button>
      </Box>

      <Box sx={{ mt: 2 }}>
        <TextField
          select
          label="Page limit"
          value={variant.pageLimit}
          onChange={(event) =>
            dispatch(
              setPageLimit({
                id: variant.id,
                pageLimit: Number(event.target.value),
              })
            )
          }
          sx={{ minWidth: 160 }}
        >
          <MenuItem value={1}>1 page</MenuItem>
          <MenuItem value={2}>2 pages</MenuItem>
        </TextField>
      </Box>

      <Box display="flex" alignItems="center" gap={2} sx={{ mt: 1 }}>
        <FormControlLabel
          label="Auto-fit to the page limit"
          control={
            <Switch
              checked={variant.isAutoFit ?? false}
              onChange={(event) =>
                dispatch(
                  setAutoFit({
                    id: variant.id,
                    isAutoFit: event.target.checked,
                  })
                )
              }
            />
          }
        />
        <TextField
          select
          size="small"
          label="Auto-fit mode"
          disabled={!variant.isAutoFit}
          value={variant.fitMode ?? "fit"}
          onChange={(event) =>
            dispatch(
              setAutoFit({
                id: variant.id,
                isAutoFit: true,
                fitMode: event.target.value as FitMode,
              })
            )
          }
          sx={{ minWidth: 200 }}
        >
          <MenuItem value="fit">Shrink to fit</MenuItem>
          <MenuItem value="fill">Fill the page</MenuItem>
        </TextField>
      </Box>

      {sections.map((section) => (
        <VariantSectionItems key={section.id} section={section} />
      ))}

      <Dialog open={isDeleting} onClose={() => setIsDeleting(false)}>
        <DialogTitle>Delete variant?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            &quot;{variant.name}&quot; will be deleted. Your data (the vault) is
            not affected.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleting(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              const next = variants.find((v) => v.id !== variant.id);
              dispatch(deleteVariant({ id: variant.id }));
              if (next) {
                activateVariant(dispatch, next);
              }
              setIsDeleting(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </LockedFieldset>
  );
}
