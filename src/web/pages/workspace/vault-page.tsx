import { MouseEvent, useEffect, useState } from "react";
import {
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { VaultItemEditor } from "@pages/workspace/vault-item-editor";
import { selectedItemOf } from "@pages/workspace/section-items";
import { AddSectionButton } from "@pages/editor-page/sections/add-section-dialog";
import { ImportCvDialog } from "@pages/workspace/import-cv-dialog";
import { useEditorPages } from "@pages/editor-page/editor-pages";
import { EditorFooter } from "@pages/editor-page/editor-footer";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import {
  MIDDLE_AREA_SX,
  WORKSPACE_COLORS,
} from "@pages/workspace/workspace-tokens";
import { useImportExportJson } from "@hooks/use-import-export-json";
import { navigate, onAppLinkClick, useRoute } from "@hooks/navigation";
import { setSelectedSectionInEditorPage } from "@store/app/app-slice";
import { formatRoute } from "@shared/routing/routes";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { UNSORTED_SECTION_ID } from "@shared/vault/unsorted";
import {
  ensureUnsortedSection,
  sectionsSelector,
} from "@store/vault/vault-slice";

const HiddenInput = styled("input")({ display: "none" });

/** Pages that are about the vault's facts. Style and layout live in Templates, job data in Jobs. */
const FACT_PAGES = new Set(["mainInfo"]);

interface TreeProps {
  selectedPage: string;
}

/** Left: the vault as a tree, plus the settings pages and JSON import/export */
function VaultTree({ selectedPage }: TreeProps): JSX.Element {
  const dispatch = useAppDispatch();
  const pages = useEditorPages();
  const sections = useAppSelector(sectionsSelector);
  const { handleImport, handleExport } = useImportExportJson();
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  const factPages = pages.filter((page) => FACT_PAGES.has(page.id));

  return (
    <ResizableAside side="left" label="the vault tree" defaultWidth={290}>
      <Box
        component="aside"
        aria-label="Vault tree"
        sx={{
          width: "100%",
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
                component="a"
                href={formatRoute({ kind: "vault", sectionId: page.id })}
                onClick={(event: MouseEvent<HTMLElement>) =>
                  onAppLinkClick(event, { kind: "vault", sectionId: page.id })
                }
              >
                <ListItemText primary={page.label} />
              </ListItemButton>
            ))}
          </List>
          <Divider sx={{ my: 1 }} />
          <Typography
            sx={{
              px: 1,
              mb: 1,
              fontSize: 11,
              fontWeight: 700,
              color: "text.secondary",
            }}
          >
            SECTIONS
          </Typography>
          <List dense disablePadding>
            {[...sections]
              .sort(
                (a, b) =>
                  Number(a.type === "unsorted") - Number(b.type === "unsorted")
              )
              .map((section) => (
                <Box key={section.id}>
                  <ListItemButton
                    selected={selectedPage === section.id}
                    component="a"
                    href={formatRoute({ kind: "vault", sectionId: section.id })}
                    onClick={(event: MouseEvent<HTMLElement>) =>
                      onAppLinkClick(event, {
                        kind: "vault",
                        sectionId: section.id,
                      })
                    }
                  >
                    <ListItemText
                      primary={section.title}
                      slotProps={{
                        primary: { sx: { fontWeight: 600 } },
                      }}
                    />
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      {section.items.length}
                    </Typography>
                  </ListItemButton>
                </Box>
              ))}
            {!sections.some((section) => section.type === "unsorted") && (
              <ListItemButton
                onClick={() => {
                  dispatch(ensureUnsortedSection());
                  navigate({ kind: "vault", sectionId: UNSORTED_SECTION_ID });
                }}
              >
                <ListItemText
                  primary="Unsorted"
                  slotProps={{ primary: { sx: { fontWeight: 600 } } }}
                />
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  0
                </Typography>
              </ListItemButton>
            )}
          </List>
          <Box sx={{ display: "flex", px: 1, pt: 1 }}>
            <AddSectionButton />
          </Box>
        </Box>
        <Box
          sx={{
            p: 1,
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
          }}
        >
          <Tooltip title="Coming soon">
            <span style={{ flex: "1 1 100%", display: "flex" }}>
              <Button
                size="small"
                variant="contained"
                disabled
                sx={{ flex: "1 1 100%" }}
                onClick={() => setIsImportOpen(true)}
              >
                Paste CV text, AI sorts it
              </Button>
            </span>
          </Tooltip>
          <ImportCvDialog
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
          />
          <Button
            component="label"
            size="small"
            variant="outlined"
            sx={{ flex: "1 1 120px" }}
          >
            Import JSON
            <HiddenInput type="file" accept=".json" onChange={handleImport} />
          </Button>
          <Button
            size="small"
            variant="outlined"
            sx={{ flex: "1 1 120px" }}
            onClick={() => handleExport("cv-export")}
          >
            Export JSON
          </Button>
        </Box>
      </Box>
    </ResizableAside>
  );
}

/**
 * Right: the item panel. It holds the editor of the item chosen in the middle list (it saves to
 * the vault as you type); on pages without an item list it stays empty.
 */
function ItemPanel({ children }: { children?: JSX.Element }): JSX.Element {
  return (
    <ResizableAside side="right" label="the item panel" defaultWidth={340}>
      <Box
        component="aside"
        aria-label="Item panel"
        sx={{
          width: "100%",
          flex: "none",
          bgcolor: WORKSPACE_COLORS.panel,
          borderLeft: `1px solid ${WORKSPACE_COLORS.border}`,
          p: 2,
          overflow: "auto",
        }}
      >
        {children}
      </Box>
    </ResizableAside>
  );
}

/** The vault tool (design B2): tree of sections, the page of the chosen section, the item panel */
export function VaultPage(): JSX.Element {
  const pages = useEditorPages();
  const route = useRoute();
  const selectedPageId =
    route.kind === "vault" ? (route.sectionId ?? "mainInfo") : "mainInfo";
  const selectedItemId = route.kind === "vault" ? (route.itemId ?? "") : "";
  const sections = useAppSelector(sectionsSelector);
  const page = pages.find((entry) => entry.id === selectedPageId) ?? pages[0];
  const section = sections.find((entry) => entry.id === selectedPageId);
  // A section with items lists them in the middle and edits the chosen one in the right panel
  const hasItemList = section !== undefined && section.type !== "summary";
  const selectedItem =
    hasItemList && section
      ? selectedItemOf(section, selectedItemId)
      : undefined;
  // The footer and the editors read the page from the store
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(setSelectedSectionInEditorPage(selectedPageId));
  }, [selectedPageId, dispatch]);

  return (
    <>
      <VaultTree selectedPage={selectedPageId} />
      <Box
        component="main"
        aria-label="Edit"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: "auto",
          ...MIDDLE_AREA_SX,
          mx: 1,
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box
          sx={{
            bgcolor: WORKSPACE_COLORS.panel,
            border: `1px solid ${WORKSPACE_COLORS.border}`,
            borderRadius: "6px",
            p: 2,
          }}
        >
          {page.content}
        </Box>
        {!hasItemList && <EditorFooter />}
      </Box>
      <ItemPanel>
        {section && selectedItem ? (
          <VaultItemEditor
            key={selectedItem.id}
            section={section}
            item={selectedItem}
            onSelectItem={(itemId) =>
              navigate({
                kind: "vault",
                sectionId: section.id,
                itemId: itemId === "" ? undefined : itemId,
              })
            }
          />
        ) : undefined}
      </ItemPanel>
    </>
  );
}
