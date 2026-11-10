import { MouseEvent, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardOutlinedIcon from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowUpwardOutlinedIcon from "@mui/icons-material/ArrowUpwardOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";
import { Item, Section } from "@custom-types/vault-types";
import { itemYear } from "@shared/vault/vault-utils";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";
import { SectionTitleField } from "@pages/editor-page/sections/section-title-field";
import { UnsortedPlacement } from "@pages/workspace/unsorted-placement";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useDraftFields, withDraft } from "@pages/workspace/draft-fields";
import { navigate, onAppLinkClick, useRoute } from "@hooks/navigation";
import { formatRoute } from "@shared/routing/routes";
import { datedTitle, getItemLabel } from "@shared/variant/item-label";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import {
  addBullet,
  addItem,
  moveItem,
  removeItem,
} from "@store/vault/vault-slice";

/** An item with nothing filled in (no field text and no bullet text) */
function isEmptyItem(item: Section["items"][number]): boolean {
  return (
    Object.values(item.fields).every((value) => value.trim() === "") &&
    item.bullets.every((bullet) => bullet.text.trim() === "")
  );
}

/** What a new item of a section starts with */
function newItemFields(section: Section): Record<string, string> {
  switch (section.type) {
    case "experience":
      return {
        jobTitle: "",
        company: "",
        location: "",
        workMode: "",
        startDate: "",
        endDate: "",
      };
    case "education":
      return {
        degree: "",
        institute: "",
        fieldOfStudy: "",
        location: "",
        workMode: "",
        startDate: "",
        endDate: "",
      };
    case "skills":
      return { category: "" };
    case "awards":
      return { title: "", issuer: "", date: "", description: "", link: "" };
    case "interests":
      return { title: "", detail: "" };
    case "publications":
      return { title: "", authors: "", journal: "", year: "", link: "" };
    default:
      return {
        title: "",
        subtitle: "",
        location: "",
        startDate: "",
        endDate: "",
      };
  }
}

const ADD_LABELS: Partial<Record<Section["type"], string>> = {
  experience: "Add new experience",
  education: "Add new education",
  skills: "Add new skill category",
};

/** Experience and education are kept in date order by the vault, so they have no arrows */
const hasManualOrder = (section: Section): boolean =>
  section.type !== "experience" &&
  section.type !== "education" &&
  section.type !== "publications" &&
  section.type !== "awards";

type ItemSort = "year" | "title";

const SORT_LABELS: Record<ItemSort, string> = { year: "Year", title: "Title" };

/** What the direction arrow means: [default, reversed] */
const SORT_DIRECTION_HINTS: Record<ItemSort, [string, string]> = {
  year: ["newest first", "oldest first"],
  title: ["A to Z", "Z to A"],
};

/** Sorting is offered for publications and awards (the vault keeps them newest first) */
const hasSortChoice = (section: Section): boolean =>
  section.type === "publications" || section.type === "awards";

/** The items in the order the list shows them (the vault order is newest first) */
function sortedForView(
  section: Section,
  sort: ItemSort,
  isReversed: boolean
): Item[] {
  if (!hasSortChoice(section) || (sort === "year" && !isReversed)) {
    return section.items;
  }
  const year = (item: Item): number =>
    itemYear(item) ?? Number.NEGATIVE_INFINITY;
  const sorted = [...section.items].sort((a, b) =>
    sort === "year"
      ? year(b) - year(a)
      : (a.fields.title ?? "").localeCompare(b.fields.title ?? "")
  );
  return isReversed ? sorted.reverse() : sorted;
}

/** The text shown on the right of a row: the year of a publication or award */
function rightText(section: Section, item: Item): string {
  return section.type === "publications"
    ? (item.fields.year ?? "")
    : section.type === "awards"
      ? (item.fields.date ?? "")
      : "";
}

/** The item the right panel shows: the one in the address, else the first */
export function selectedItemOf(
  section: Section,
  itemId: string
): Item | undefined {
  return section.items.find((item) => item.id === itemId) ?? section.items[0];
}

/**
 * A section page of the vault: the title of the section and the list of its items (titles
 * only). The inputs of the chosen item are in the right panel.
 */
export function SectionItems({ section }: { section: Section }): JSX.Element {
  const dispatch = useAppDispatch();
  const route = useRoute();
  const { dateFormat } = useAppSelector(styleSelector);
  const [removingId, setRemovingId] = useState<string>("");
  const [sort, setSort] = useState<ItemSort>("year");
  const [isReversed, setIsReversed] = useState(false);
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const itemId = route.kind === "vault" ? (route.itemId ?? "") : "";
  const selected = selectedItemOf(section, itemId);
  const removing = section.items.find((item) => item.id === removingId);

  const draftFields = useDraftFields();

  function select(id: string): void {
    navigate({ kind: "vault", sectionId: section.id, itemId: id });
  }

  function add(): void {
    // Only one empty item at a time: open the existing empty one instead
    const empty = section.items.find(isEmptyItem);
    if (empty) {
      select(empty.id);
      return;
    }
    const item = dispatch(
      addItem({ sectionId: section.id, fields: newItemFields(section) })
    ).payload;
    if (section.type === "skills") {
      dispatch(
        addBullet({
          sectionId: section.id,
          itemId: item.id,
          text: "",
          rating: 0,
        })
      );
    }
    select(item.id);
  }

  return (
    <>
      <SectionTitleField key={`title-${section.id}`} section={section} />
      {section.type === "unsorted" && <UnsortedPlacement section={section} />}
      {hasSortChoice(section) && section.items.length > 1 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Button
            size="small"
            aria-haspopup="menu"
            onClick={(event) => setSortAnchor(event.currentTarget)}
          >
            Sort by: {SORT_LABELS[sort]}
          </Button>
          <Tooltip title={SORT_DIRECTION_HINTS[sort][isReversed ? 1 : 0]}>
            <Button
              size="small"
              aria-label={`Reverse the order (now ${SORT_DIRECTION_HINTS[sort][isReversed ? 1 : 0]})`}
              onClick={() => setIsReversed((value) => !value)}
              sx={{ minWidth: 0, px: 0.75 }}
            >
              {isReversed ? (
                <ArrowUpwardOutlinedIcon fontSize="small" />
              ) : (
                <ArrowDownwardOutlinedIcon fontSize="small" />
              )}
            </Button>
          </Tooltip>
          <Menu
            anchorEl={sortAnchor}
            open={sortAnchor !== null}
            onClose={() => setSortAnchor(null)}
          >
            {(Object.keys(SORT_LABELS) as ItemSort[]).map((key) => (
              <MenuItem
                key={key}
                selected={key === sort}
                onClick={() => {
                  setSort(key);
                  setIsReversed(false);
                  setSortAnchor(null);
                }}
              >
                {SORT_LABELS[key]}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      )}
      <Box
        component="ul"
        aria-label="Items"
        sx={{ listStyle: "none", m: 0, p: 0 }}
      >
        {sortedForView(section, sort, isReversed).map((item, index) => {
          const isSelected = selected?.id === item.id;
          const shown = withDraft(item, draftFields);
          const title =
            datedTitle(
              getItemLabel(shown, Infinity),
              shown.fields.startDate,
              shown.fields.endDate,
              (day) => dayjs(day).format(dateFormat)
            ) || "(untitled)";
          return (
            <Box
              component="li"
              key={item.id}
              data-selected={isSelected}
              sx={{
                display: "flex",
                alignItems: "center",
                borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
                borderLeft: `3px solid ${
                  isSelected ? WORKSPACE_COLORS.accent : "transparent"
                }`,
                bgcolor: isSelected
                  ? WORKSPACE_COLORS.accentSoft
                  : "transparent",
              }}
            >
              {hasManualOrder(section) && (
                <SortingIcons
                  index={index}
                  swapFunction={(_from, toIndex) =>
                    dispatch(
                      moveItem({
                        sectionId: section.id,
                        itemId: item.id,
                        toIndex,
                      })
                    )
                  }
                  isLastEntity={index === section.items.length - 1}
                />
              )}
              <Box
                component="a"
                href={formatRoute({
                  kind: "vault",
                  sectionId: section.id,
                  itemId: item.id,
                })}
                aria-current={isSelected}
                onClick={(event: MouseEvent<HTMLElement>) =>
                  onAppLinkClick(event, {
                    kind: "vault",
                    sectionId: section.id,
                    itemId: item.id,
                  })
                }
                sx={{
                  flex: 1,
                  minWidth: 0,
                  color: "inherit",
                  textDecoration: "none",
                  px: 1.5,
                  py: 1.5,
                  fontWeight: isSelected ? 600 : 400,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </Box>
              {rightText(section, shown) && (
                <Box
                  component="span"
                  sx={{
                    px: 1.5,
                    fontSize: 13,
                    color: WORKSPACE_COLORS.muted,
                    whiteSpace: "nowrap",
                  }}
                >
                  {rightText(section, shown)}
                </Box>
              )}
              <IconButton
                aria-label={`Delete ${title}`}
                onClick={() => setRemovingId(item.id)}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          );
        })}
      </Box>
      <Button
        startIcon={<AddIcon />}
        sx={{ alignSelf: "flex-start" }}
        onClick={add}
      >
        {ADD_LABELS[section.type] ?? "Add new item"}
      </Button>
      <Dialog open={removing !== undefined} onClose={() => setRemovingId("")}>
        <DialogTitle>Remove this item?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            It is removed from the vault and from every job. Until you press
            Save you can still reload the page to get it back.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemovingId("")}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              dispatch(
                removeItem({ sectionId: section.id, itemId: removingId })
              );
              setRemovingId("");
              if (itemId === removingId) {
                navigate(
                  { kind: "vault", sectionId: section.id },
                  { replace: true }
                );
              }
            }}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
