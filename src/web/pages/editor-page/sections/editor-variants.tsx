import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
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
import { FitMode, Wording } from "@custom-types/variant-types";
import { Item } from "@custom-types/vault-types";
import { activateVariant } from "@hooks/use-sync-active-variant";
import { getItemLabel, shorten } from "@shared/variant/item-label";
import { sortItemsByVariant } from "@shared/variant/render";
import { computeItemOrders } from "@shared/variant/variant-utils";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  addVariant,
  deleteVariant,
  duplicateVariant,
  renameVariant,
  setBulletSelection,
  setItemOrders,
  setItemSelection,
  setAutoFit,
  setPageLimit,
  variantsSelector,
} from "@store/variants/variants-slice";
import { sectionsSelector, vaultSelector } from "@store/vault/vault-slice";

const WORDING_LABELS: Record<Wording, string> = {
  text: "Original",
  short: "Short",
  long: "Long",
  formal: "Formal",
};

function availableWordings(item: Item, bulletId: string): Wording[] {
  const alt = item.bullets.find((b) => b.id === bulletId)?.alt;
  return [
    "text",
    ...(["short", "long", "formal"] as const).filter((key) => alt?.[key]),
  ];
}

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
    <>
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

      {sections.map((section) => {
        const items = sortItemsByVariant(section.items, variant.selection);
        if (items.length === 0) {
          return null;
        }
        return (
          <Box key={section.id} sx={{ mt: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {section.title}
            </Typography>
            {items.map((item, index) => (
              <Box key={item.id} sx={{ mt: 1 }}>
                <Box display="flex" alignItems="center">
                  <SortingIcons
                    index={index}
                    swapFunction={(_from, toIndex) =>
                      dispatch(
                        setItemOrders({
                          variantId: variant.id,
                          orders: computeItemOrders(
                            section.items,
                            variant,
                            item.id,
                            toIndex
                          ),
                        })
                      )
                    }
                    isLastEntity={index === items.length - 1}
                  />
                  <FormControlLabel
                    sx={{ flexGrow: 1 }}
                    label={getItemLabel(item)}
                    control={
                      <Checkbox
                        checked={
                          variant.selection[item.id]?.isVisible !== false
                        }
                        onChange={(event) =>
                          dispatch(
                            setItemSelection({
                              variantId: variant.id,
                              itemId: item.id,
                              change: { isVisible: event.target.checked },
                            })
                          )
                        }
                      />
                    }
                  />
                  <FormControlLabel
                    label="Highlight"
                    control={
                      <Checkbox
                        size="small"
                        checked={
                          variant.selection[item.id]?.emphasis === "high"
                        }
                        onChange={(event) =>
                          dispatch(
                            setItemSelection({
                              variantId: variant.id,
                              itemId: item.id,
                              change: {
                                emphasis: event.target.checked
                                  ? "high"
                                  : "normal",
                              },
                            })
                          )
                        }
                      />
                    }
                  />
                </Box>
                {variant.selection[item.id]?.isVisible !== false &&
                  item.bullets.map((bullet) => {
                    const choice =
                      variant.selection[item.id]?.bullets?.[bullet.id];
                    const wordings = availableWordings(item, bullet.id);
                    return (
                      <Box
                        key={bullet.id}
                        display="flex"
                        alignItems="center"
                        gap={1}
                        sx={{ pl: 8 }}
                      >
                        <FormControlLabel
                          sx={{ flexGrow: 1 }}
                          label={shorten(bullet.text)}
                          control={
                            <Checkbox
                              size="small"
                              checked={choice?.isVisible !== false}
                              onChange={(event) =>
                                dispatch(
                                  setBulletSelection({
                                    variantId: variant.id,
                                    itemId: item.id,
                                    bulletId: bullet.id,
                                    change: { isVisible: event.target.checked },
                                  })
                                )
                              }
                            />
                          }
                        />
                        {wordings.length > 1 && (
                          <TextField
                            select
                            size="small"
                            label="Wording"
                            value={choice?.wording ?? "text"}
                            onChange={(event) =>
                              dispatch(
                                setBulletSelection({
                                  variantId: variant.id,
                                  itemId: item.id,
                                  bulletId: bullet.id,
                                  change: {
                                    wording: event.target.value as Wording,
                                  },
                                })
                              )
                            }
                            sx={{ minWidth: 120 }}
                          >
                            {wordings.map((w) => (
                              <MenuItem key={w} value={w}>
                                {WORDING_LABELS[w]}
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      </Box>
                    );
                  })}
              </Box>
            ))}
          </Box>
        );
      })}

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
    </>
  );
}
