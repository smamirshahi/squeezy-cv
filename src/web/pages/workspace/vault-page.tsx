import { MouseEvent, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { VaultItemEditor } from "@pages/workspace/vault-item-editor";
import { ImportCvDialog } from "@pages/workspace/import-cv-dialog";
import { getItemLabel } from "@shared/variant/item-label";
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
import { variantsSelector } from "@store/jobs/jobs-slice";
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
  selectedItemId: string;
}

/** Left: the vault as a tree, plus the settings pages and JSON import/export */
function VaultTree({ selectedPage, selectedItemId }: TreeProps): JSX.Element {
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
                    selected={selectedPage === section.id && !selectedItemId}
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
                  {section.type !== "summary" &&
                    section.items.map((item) => (
                      <ListItemButton
                        key={item.id}
                        sx={{ pl: 4 }}
                        selected={selectedItemId === item.id}
                        component="a"
                        href={formatRoute({
                          kind: "vault",
                          sectionId: section.id,
                          itemId: item.id,
                        })}
                        onClick={(event: MouseEvent<HTMLElement>) =>
                          onAppLinkClick(event, {
                            kind: "vault",
                            sectionId: section.id,
                            itemId: item.id,
                          })
                        }
                      >
                        <ListItemText primary={getItemLabel(item)} />
                      </ListItemButton>
                    ))}
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
    </ResizableAside>
  );
}

/**
 * Right: the item panel. It has nothing to show for now (what a job shows is decided in the
 * job, and a sent application is a frozen copy), so it stays empty.
 */
function ItemPanel(): JSX.Element {
  return (
    <ResizableAside side="right" label="the item panel" defaultWidth={300}>
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
      />
    </ResizableAside>
  );
}

/** The vault tool (design B2): tree, the editor for the chosen page, and an empty item panel */
export function VaultPage(): JSX.Element {
  const pages = useEditorPages();
  const route = useRoute();
  const selectedPageId =
    route.kind === "vault" ? (route.sectionId ?? "mainInfo") : "mainInfo";
  const selectedItemId = route.kind === "vault" ? (route.itemId ?? "") : "";
  const variants = useAppSelector(variantsSelector);
  const sections = useAppSelector(sectionsSelector);
  const page = pages.find((entry) => entry.id === selectedPageId) ?? pages[0];
  // An item chosen in the tree is edited inline (no Apply step); only the summary has no item list
  const selectedSection = sections.find((section) =>
    section.items.some((item) => item.id === selectedItemId)
  );
  const selectedItem = selectedSection?.items.find(
    (item) => item.id === selectedItemId
  );
  // The footer and the editors read the page from the store
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(setSelectedSectionInEditorPage(selectedPageId));
  }, [selectedPageId, dispatch]);
  const setSelectedItemId = (itemId: string): void => {
    navigate({
      kind: "vault",
      sectionId: selectedSection?.id ?? selectedPageId,
      itemId: itemId === "" ? undefined : itemId,
    });
  };
  const hasInlineEditor =
    selectedSection !== undefined &&
    selectedItem !== undefined &&
    selectedSection.type !== "summary";

  return (
    <>
      <VaultTree
        selectedPage={selectedPageId}
        selectedItemId={selectedItemId}
      />
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
        {hasInlineEditor && (
          <VaultItemEditor
            key={selectedItem.id}
            section={selectedSection}
            item={selectedItem}
            onSelectItem={setSelectedItemId}
          />
        )}
        {!hasInlineEditor && (
          <Alert severity="warning">
            You are editing a <b>vault fact</b>. Changes apply to all{" "}
            {variants.length} {variants.length === 1 ? "job" : "jobs"} that use
            it. To change only one job, edit it on the page instead.
          </Alert>
        )}
        {!hasInlineEditor && (
          <>
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
            <EditorFooter />
          </>
        )}
      </Box>
      <ItemPanel />
    </>
  );
}
