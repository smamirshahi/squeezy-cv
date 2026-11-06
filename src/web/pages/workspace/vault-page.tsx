import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { styled } from "@mui/material/styles";
import { ImportCvDialog } from "@pages/workspace/import-cv-dialog";
import { getItemLabel } from "@shared/variant/item-label";
import { useEditorPages } from "@pages/editor-page/editor-pages";
import { EditorFooter } from "@pages/editor-page/editor-footer";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useImportExportJson } from "@hooks/use-import-export-json";
import { setSelectedSectionInEditorPage } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  setItemSelection,
  variantsSelector,
} from "@store/variants/variants-slice";
import { sectionsSelector } from "@store/vault/vault-slice";

const HiddenInput = styled("input")({ display: "none" });

/** Pages that are about the vault's facts; the rest (style, layout, variants) are settings */
const FACT_PAGES = new Set(["mainInfo", "sections"]);
const SETTING_PAGES = new Set([
  "metaData",
  "styleSettings",
  "pageStructure",
  "variants",
]);

interface TreeProps {
  selectedItemId: string;
  onSelectItem: (itemId: string) => void;
}

/** Left: the vault as a tree, plus the settings pages and JSON import/export */
function VaultTree({ selectedItemId, onSelectItem }: TreeProps): JSX.Element {
  const dispatch = useAppDispatch();
  const pages = useEditorPages();
  const sections = useAppSelector(sectionsSelector);
  const selectedPage = useAppSelector((s) => s.app.selectedSectionInEditorPage);
  const { handleImport, handleExport } = useImportExportJson();
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  const factPages = pages.filter((page) => FACT_PAGES.has(page.id));
  const settingPages = pages.filter((page) => SETTING_PAGES.has(page.id));

  return (
    <Box
      component="aside"
      aria-label="Vault tree"
      sx={{
        width: 290,
        flex: "none",
        bgcolor: WORKSPACE_COLORS.panel,
        borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
        <List dense disablePadding>
          {factPages.map((page) => (
            <ListItemButton
              key={page.id}
              selected={selectedPage === page.id}
              onClick={() => dispatch(setSelectedSectionInEditorPage(page.id))}
            >
              <ListItemText primary={page.label} />
            </ListItemButton>
          ))}
          {sections.map((section) => (
            <Box key={section.id}>
              <ListItemButton
                selected={selectedPage === section.id && !selectedItemId}
                onClick={() => {
                  dispatch(setSelectedSectionInEditorPage(section.id));
                  onSelectItem("");
                }}
              >
                <ListItemText
                  primary={section.title}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {section.items.length}
                </Typography>
              </ListItemButton>
              {section.type !== "summary" &&
                section.items.map((item) => (
                  <ListItemButton
                    key={item.id}
                    sx={{ pl: 4 }}
                    selected={selectedItemId === item.id}
                    onClick={() => {
                      dispatch(setSelectedSectionInEditorPage(section.id));
                      onSelectItem(item.id);
                    }}
                  >
                    <ListItemText primary={getItemLabel(item)} />
                  </ListItemButton>
                ))}
            </Box>
          ))}
        </List>
        <Divider sx={{ my: 1 }} />
        <Typography
          sx={{ px: 1, fontSize: 11, fontWeight: 700, color: "text.secondary" }}
        >
          SETTINGS
        </Typography>
        <List dense disablePadding>
          {settingPages.map((page) => (
            <ListItemButton
              key={page.id}
              selected={selectedPage === page.id}
              onClick={() => dispatch(setSelectedSectionInEditorPage(page.id))}
            >
              <ListItemText primary={page.label} />
            </ListItemButton>
          ))}
        </List>
      </Box>
      <Box
        sx={{
          p: 1,
          display: "flex",
          gap: 1,
          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
          flexWrap: "wrap",
        }}
      >
        <Button
          size="small"
          variant="contained"
          onClick={() => setIsImportOpen(true)}
        >
          Paste CV text, AI sorts it
        </Button>
        <ImportCvDialog
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
        />
        <Button component="label" size="small" variant="outlined">
          Import JSON
          <HiddenInput type="file" accept=".json" onChange={handleImport} />
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => handleExport("cv-export")}
        >
          Export JSON
        </Button>
      </Box>
    </Box>
  );
}

/** Right: in which variants an item is shown; the eye hides it there only */
function AppearsIn({ itemId }: { itemId: string }): JSX.Element {
  const dispatch = useAppDispatch();
  const variants = useAppSelector(variantsSelector);
  return (
    <Box
      component="aside"
      aria-label="Appears in"
      sx={{
        width: 300,
        flex: "none",
        bgcolor: WORKSPACE_COLORS.panel,
        borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
        p: 2,
        overflow: "auto",
      }}
    >
      <Typography sx={{ fontWeight: 700, mb: 1 }}>
        Where this item appears
      </Typography>
      {itemId ? (
        <>
          {variants.map((variant) => {
            const isShown = variant.selection[itemId]?.isVisible !== false;
            return (
              <Box
                key={variant.id}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Typography
                  sx={{
                    flex: 1,
                    fontSize: 13,
                    opacity: isShown ? 1 : 0.5,
                  }}
                >
                  {variant.name}
                </Typography>
                <IconButton
                  size="small"
                  aria-label={`${isShown ? "Hide in" : "Show in"} ${variant.name}`}
                  onClick={() =>
                    dispatch(
                      setItemSelection({
                        variantId: variant.id,
                        itemId,
                        change: { isVisible: !isShown },
                      })
                    )
                  }
                >
                  {isShown ? (
                    <VisibilityIcon fontSize="small" />
                  ) : (
                    <VisibilityOffIcon fontSize="small" />
                  )}
                </IconButton>
              </Box>
            );
          })}
          <Typography
            sx={{ mt: 1, fontSize: 12, color: WORKSPACE_COLORS.muted }}
          >
            The eye hides this item in that variant. The fact stays in the vault
            and in every other variant.
          </Typography>
        </>
      ) : (
        <Typography sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}>
          Pick an item in the tree to see which variants show it.
        </Typography>
      )}
    </Box>
  );
}

/** The vault tool (design B2): tree, the editor for the chosen page, and where an item appears */
export function VaultPage(): JSX.Element {
  const pages = useEditorPages();
  const selectedPageId = useAppSelector(
    (s) => s.app.selectedSectionInEditorPage
  );
  const variants = useAppSelector(variantsSelector);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const page = pages.find((entry) => entry.id === selectedPageId) ?? pages[0];
  const isFact = !SETTING_PAGES.has(page.id) && page.id !== "ai";

  return (
    <>
      <VaultTree
        selectedItemId={selectedItemId}
        onSelectItem={setSelectedItemId}
      />
      <Box
        component="main"
        aria-label="Edit"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          bgcolor: "#F3F4F5",
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {isFact && (
          <Alert severity="warning">
            You are editing a <b>vault fact</b>. Changes apply to all{" "}
            {variants.length} {variants.length === 1 ? "variant" : "variants"}{" "}
            that use it. To change only one variant, edit it on the page
            instead.
          </Alert>
        )}
        <Box sx={{ bgcolor: WORKSPACE_COLORS.panel, borderRadius: 1, p: 2 }}>
          {page.content}
        </Box>
        <EditorFooter />
      </Box>
      <AppearsIn itemId={selectedItemId} />
    </>
  );
}
