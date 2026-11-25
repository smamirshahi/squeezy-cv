import { MouseEvent, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  styled,
} from "@components/ui";
import {
  ArrowBackIosNewOutlined as ArrowBackIosNewIcon,
  MoreVertOutlined as MoreVertIcon,
} from "@components/ui/icons";
import { VaultItemEditor } from "@pages/workspace/vault-item-editor";
import { selectedItemOf } from "@pages/workspace/section-items";
import { AddSectionButton } from "@pages/editor-page/sections/add-section-dialog";
import { AiIcon } from "@components/ai-button";
import { useRecentImport } from "@store/vault/recent-import";
import { ImportCvDialog } from "@pages/workspace/import-cv-dialog";
import { useEditorPages } from "@pages/editor-page/editor-pages";
import { EditorFooter } from "@pages/editor-page/editor-footer";
import { MainInfoAsideContext } from "@pages/editor-page/sections/main-info-preview";
import { ResizableAside } from "@pages/workspace/resizable-aside";
import {
  MIDDLE_AREA_SX,
  WORKSPACE_COLORS,
} from "@pages/workspace/workspace-tokens";
import { useImportExportJson } from "@hooks/use-import-export-json";
import { useViewport, Viewport } from "@hooks/use-viewport";
import { navigate, onAppLinkClick, useRoute } from "@hooks/navigation";
import { setSelectedSectionInEditorPage } from "@store/app/app-slice";
import { formatRoute } from "@shared/routing/routes";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  ensureUnsortedSection,
  sectionsSelector,
} from "@store/vault/vault-slice";
import { UNSORTED_SECTION_ID } from "@shared/vault/unsorted";

const HiddenInput = styled("input")({ display: "none" });

/** Pages that are about the vault's facts. Style and layout live in Templates, job data in Jobs. */
const FACT_PAGES = new Set(["mainInfo"]);

interface TreeProps {
  selectedPage: string;
  viewport: Viewport;
}

/** Width of the tree: narrower on tablets and small laptops, as before on a desktop */
const TREE_WIDTH: Record<Viewport, number> = {
  phone: 290,
  tablet: 176,
  laptop: 200,
  desktop: 290,
};

/** Left: the vault as a tree, plus the settings pages and JSON import/export */
function VaultTree({ selectedPage, viewport }: TreeProps): JSX.Element {
  const dispatch = useAppDispatch();
  const pages = useEditorPages();
  const sections = useAppSelector(sectionsSelector);
  const recent = useRecentImport();
  const { handleImport, handleExport } = useImportExportJson();
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  const factPages = pages.filter((page) => FACT_PAGES.has(page.id));
  const unsorted = sections.find((section) => section.type === "unsorted");
  const unsortedCount = unsorted?.items.length ?? 0;

  return (
    <ResizableAside
      side="left"
      label="the vault tree"
      defaultWidth={TREE_WIDTH[viewport]}
    >
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
            {sections
              .filter((section) => section.type !== "unsorted")
              .map((section) => (
                <Box key={section.id}>
                  <ListItemButton
                    selected={selectedPage === section.id}
                    component="a"
                    href={formatRoute({
                      kind: "vault",
                      sectionId: section.id,
                    })}
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
                    {recent[section.id]?.added ? (
                      <Chip
                        size="small"
                        color="success"
                        label={`${recent[section.id].added} new`}
                        sx={{ mr: 0.5 }}
                      />
                    ) : null}
                    {recent[section.id]?.updated ? (
                      <Chip
                        size="small"
                        color="info"
                        label={`${recent[section.id].updated} updated`}
                        sx={{ mr: 0.5 }}
                      />
                    ) : null}
                    <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                      {section.items.length}
                    </Typography>
                  </ListItemButton>
                </Box>
              ))}
          </List>
          <Box sx={{ display: "flex", px: 1, pt: 1 }}>
            <AddSectionButton />
          </Box>
          <Typography
            sx={{
              px: 1,
              pt: 2,
              pb: 0.5,
              fontSize: 11,
              fontWeight: 700,
              color: "text.secondary",
            }}
          >
            ASSISTANTS
          </Typography>
          <List dense disablePadding>
            <ListItemButton
              selected={selectedPage === UNSORTED_SECTION_ID}
              onClick={() => {
                if (!unsorted) {
                  dispatch(ensureUnsortedSection());
                }
                navigate({ kind: "vault", sectionId: UNSORTED_SECTION_ID });
              }}
            >
              <ListItemText
                primary="Unsorted"
                slotProps={{ primary: { sx: { fontWeight: 600 } } }}
              />
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: unsortedCount > 0 ? 700 : 400,
                  px: 0.75,
                  borderRadius: 10,
                  color:
                    unsortedCount > 0 ? "secondary.main" : "text.secondary",
                  bgcolor:
                    unsortedCount > 0 ? WORKSPACE_COLORS.aiSoft : "transparent",
                }}
              >
                {unsortedCount}
              </Typography>
            </ListItemButton>
            <ListItemButton onClick={() => setIsImportOpen(true)}>
              <Box
                sx={{
                  display: "flex",
                  mr: 1,
                  color: "secondary.main",
                }}
              >
                <AiIcon />
              </Box>
              <ListItemText
                primary="Paste CV text, AI sorts it"
                slotProps={{
                  primary: { sx: { fontWeight: 600, color: "secondary.main" } },
                }}
              />
            </ListItemButton>
          </List>
          <ImportCvDialog
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
          />
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
          <Button
            component="label"
            size="small"
            variant="outlined"
            sx={{ flex: { xs: "1 1 100%", lg: "1 1 120px" } }}
          >
            Import JSON
            <HiddenInput type="file" accept=".json" onChange={handleImport} />
          </Button>
          <Button
            size="small"
            variant="outlined"
            sx={{ flex: { xs: "1 1 100%", lg: "1 1 120px" } }}
            onClick={() => handleExport("cv-export")}
          >
            Export JSON
          </Button>
        </Box>
      </Box>
    </ResizableAside>
  );
}

const PANEL_WIDTH = 340;
const PANEL_WIDTH_LAPTOP = 260;

/** Phone: the vault tree as a row of chips above the content (same links, scrolls sideways) */
function VaultChips({ selectedPage }: { selectedPage: string }): JSX.Element {
  const pages = useEditorPages();
  const sections = useAppSelector(sectionsSelector);
  const { handleImport, handleExport } = useImportExportJson();
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const factPages = pages.filter((page) => FACT_PAGES.has(page.id));
  const ordered = [...sections].sort(
    (a, b) => Number(a.type === "unsorted") - Number(b.type === "unsorted")
  );

  return (
    <Box
      component="aside"
      aria-label="Vault tree"
      sx={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        overflowX: "auto",
        bgcolor: WORKSPACE_COLORS.panel,
        borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
      {[
        ...factPages.map((page) => ({
          id: page.id,
          label: page.label,
          isOff: false,
        })),
        ...ordered.map((section) => {
          return {
            id: section.id,
            label: section.title,
            isOff: false,
          };
        }),
      ].map((entry) => (
        <Chip
          key={entry.id}
          component="a"
          clickable={!entry.isOff}
          disabled={entry.isOff}
          href={formatRoute({ kind: "vault", sectionId: entry.id })}
          onClick={(event: MouseEvent<HTMLElement>) =>
            onAppLinkClick(event, { kind: "vault", sectionId: entry.id })
          }
          label={entry.label}
          variant={selectedPage === entry.id ? "filled" : "outlined"}
          color={selectedPage === entry.id ? "primary" : "default"}
          sx={{ height: 36, flex: "none", fontWeight: 600 }}
        />
      ))}
      <Box sx={{ flex: "none" }}>
        <AddSectionButton />
      </Box>
      <IconButton
        aria-label="More vault actions"
        onClick={(event) => setMenuAnchor(event.currentTarget)}
        sx={{ flex: "none", width: 44, height: 44 }}
      >
        <MoreVertIcon />
      </IconButton>
      <Menu
        keepMounted
        anchorEl={menuAnchor}
        open={menuAnchor !== null}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem component="label" sx={{ minHeight: 44 }}>
          Import JSON
          <HiddenInput
            type="file"
            accept=".json"
            onChange={(event) => {
              handleImport(event);
              setMenuAnchor(null);
            }}
          />
        </MenuItem>
        <MenuItem
          sx={{ minHeight: 44 }}
          onClick={() => {
            handleExport("cv-export");
            setMenuAnchor(null);
          }}
        >
          Export JSON
        </MenuItem>
        <MenuItem
          disabled
          sx={{ minHeight: 44 }}
          onClick={() => setIsImportOpen(true)}
        >
          Paste CV text, AI sorts it
        </MenuItem>
      </Menu>
      <ImportCvDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </Box>
  );
}

/**
 * Right: the item panel. It holds the editor of the item chosen in the middle list (it saves to
 * the vault as you type); on pages without an item list it stays empty.
 */
function ItemPanel({
  children,
  viewport,
}: {
  children?: JSX.Element;
  viewport: Viewport;
}): JSX.Element {
  return (
    <ResizableAside
      side="right"
      label="the item panel"
      defaultWidth={viewport === "laptop" ? PANEL_WIDTH_LAPTOP : PANEL_WIDTH}
    >
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

/** Phone: the item is its own screen; this takes you back to the list of the section */
function BackToSection({ sectionId, title }: PageLink): JSX.Element {
  const route = { kind: "vault", sectionId } as const;
  return (
    <Button
      component="a"
      href={formatRoute(route)}
      onClick={(event: MouseEvent<HTMLElement>) => onAppLinkClick(event, route)}
      startIcon={<ArrowBackIosNewIcon fontSize="small" />}
      sx={{ alignSelf: "flex-start", minHeight: 44 }}
    >
      {title}
    </Button>
  );
}

interface PageLink {
  sectionId: string;
  title: string;
}

/** The vault tool (design B2): tree of sections, the page of the chosen section, the item panel */
export function VaultPage(): JSX.Element {
  const pages = useEditorPages();
  const route = useRoute();
  const viewport = useViewport();
  const isPhone = viewport === "phone";
  // Tablet and phone have no side panel: the item editor goes under the list (phone: own screen)
  const isStacked = isPhone || viewport === "tablet";
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
  const isItemScreen =
    isPhone && selectedItem !== undefined && !!selectedItemId;
  // The footer and the editors read the page from the store
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(setSelectedSectionInEditorPage(selectedPageId));
  }, [selectedPageId, dispatch]);

  const [asideSlot, setAsideSlot] = useState<HTMLElement | null>(null);

  const panelContent =
    section && selectedItem ? (
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
    ) : selectedPageId === "mainInfo" ? (
      <div ref={setAsideSlot} />
    ) : undefined;

  const middle = (
    <Box
      component="main"
      aria-label="Edit"
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        ...MIDDLE_AREA_SX,
        mx: { xs: 0, sm: 1 },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          p: { xs: 1.5, sm: 3 },
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {isItemScreen && section ? (
          <BackToSection sectionId={section.id} title={section.title} />
        ) : selectedPageId === "mainInfo" ? (
          // Main Info is made of its own cards
          page.content
        ) : (
          <Box
            sx={{
              bgcolor: WORKSPACE_COLORS.panel,
              border: `1px solid ${WORKSPACE_COLORS.border}`,
              borderRadius: "6px",
              p: { xs: 1.5, sm: 2 },
            }}
          >
            {page.content}
          </Box>
        )}
        {isStacked && panelContent}
      </Box>
      {!hasItemList && <EditorFooter />}
    </Box>
  );

  return (
    <MainInfoAsideContext.Provider value={asideSlot}>
      {isPhone ? (
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <VaultChips selectedPage={selectedPageId} />
          {middle}
        </Box>
      ) : (
        <>
          <VaultTree selectedPage={selectedPageId} viewport={viewport} />
          {middle}
        </>
      )}
      {!isStacked && <ItemPanel viewport={viewport}>{panelContent}</ItemPanel>}
    </MainInfoAsideContext.Provider>
  );
}
