import { MouseEvent, useState } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from "@components/ui";
import {
  AddOutlined as AddIcon,
  ArrowDownwardOutlined as ArrowDownwardOutlinedIcon,
  ArrowUpwardOutlined as ArrowUpwardOutlinedIcon,
  DeleteOutlined as DeleteIcon,
} from "@components/ui/icons";
import dayjs from "dayjs";
import { Item, Section } from "@custom-types/vault-types";
import { itemYear } from "@shared/vault/vault-utils";
import { SectionTitleField } from "@pages/editor-page/sections/section-title-field";
import { UnsortedPlacement } from "@pages/workspace/unsorted-placement";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { requestFocusOnNewItem } from "@pages/workspace/new-item-focus";
import { useDraftFields, withDraft } from "@pages/workspace/draft-fields";
import { navigate, onAppLinkClick, useRoute } from "@hooks/navigation";
import { formatRoute } from "@shared/routing/routes";
import { fromMonthValue } from "@shared/vault/item-fields";
import {
  datedTitle,
  entryColumns,
  getItemLabel,
} from "@shared/variant/item-label";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { addBullet, addItem, removeItem } from "@store/vault/vault-slice";

/** An item with nothing filled in (no field text and no bullet text); the end date a new item starts with does not count */
function isEmptyItem(item: Section["items"][number]): boolean {
  return (
    Object.entries(item.fields).every(
      ([key, value]) => key === "endDate" || value.trim() === ""
    ) && item.bullets.every((bullet) => bullet.text.trim() === "")
  );
}

/** This month as a date ("YYYY-MM-01"): a new job or study starts with it as its end, so "Current" is unchecked */
function thisMonth(): string {
  return fromMonthValue(new Date().toISOString().slice(0, 7));
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
        endDate: thisMonth(),
      };
    case "education":
      return {
        degree: "",
        institute: "",
        fieldOfStudy: "",
        location: "",
        workMode: "",
        startDate: "",
        endDate: thisMonth(),
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

/** How a section can be sorted in the list. The first option is the vault's own order (newest first). */
interface SortOption {
  key: string;
  label: string;

  /** "date": newest first, then reversed; "text": A to Z, then reversed */
  kind: "date" | "text";

  /** The text a "text" sort compares */
  text?: (item: Item) => string;
}

const field =
  (key: string) =>
  (item: Item): string =>
    item.fields[key] ?? "";

const DATES: SortOption = { key: "dates", label: "Dates", kind: "date" };
const TITLE: SortOption = {
  key: "title",
  label: "Title",
  kind: "text",
  text: field("title"),
};

/** The list's own order, first for sections that have no date or year to start from */
const ORDER: SortOption = { key: "order", label: "Order", kind: "text" };

/** Sort choices by section type; a type without an entry (summary, unsorted) is not sorted. The first option is the vault order. */
const SORT_OPTIONS: Partial<Record<Section["type"], SortOption[]>> = {
  experience: [
    DATES,
    {
      key: "organisation",
      label: "Organisation",
      kind: "text",
      text: field("company"),
    },
    {
      key: "jobTitle",
      label: "Job title",
      kind: "text",
      text: field("jobTitle"),
    },
  ],
  education: [
    DATES,
    {
      key: "institute",
      label: "Institute",
      kind: "text",
      text: field("institute"),
    },
    { key: "degree", label: "Degree", kind: "text", text: field("degree") },
  ],
  publications: [
    { ...DATES, key: "year", label: "Year" },
    TITLE,
    { key: "journal", label: "Journal", kind: "text", text: field("journal") },
  ],
  awards: [
    { ...DATES, key: "date", label: "Date" },
    TITLE,
    { key: "issuer", label: "Issuer", kind: "text", text: field("issuer") },
  ],
  skills: [
    ORDER,
    {
      key: "category",
      label: "Category",
      kind: "text",
      text: field("category"),
    },
  ],
  interests: [
    ORDER,
    { key: "title", label: "Interest", kind: "text", text: field("title") },
  ],
  projects: [ORDER, DATES, TITLE],
  certifications: [ORDER, DATES, TITLE],
  volunteering: [ORDER, DATES, TITLE],
  custom: [ORDER, DATES, TITLE],
};

const sortOptionsOf = (section: Section): SortOption[] =>
  SORT_OPTIONS[section.type] ?? [];

/** A list is only sortable from this many items */
const MIN_ITEMS_TO_SORT = 2;

/** What the direction arrow means: [default, reversed] */
const SORT_DIRECTION_HINTS: Record<SortOption["kind"], [string, string]> = {
  date: ["newest first", "oldest first"],
  text: ["A to Z", "Z to A"],
};

/** A comparable moment for an item: its start date, date or year (items without one come last) */
function dateValue(item: Item): number {
  const text = item.fields.startDate || item.fields.date || item.fields.year;
  const parsed = text ? Date.parse(text) : Number.NaN;
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  const year = itemYear(item);
  return year === null ? Number.NEGATIVE_INFINITY : Date.UTC(year, 0);
}

/** The items in the order the list shows them (the vault order is newest first) */
function sortedForView(
  section: Section,
  option: SortOption | undefined,
  isReversed: boolean
): Item[] {
  const isDefault = option === sortOptionsOf(section)[0];
  if (!option || (isDefault && !isReversed)) {
    return section.items;
  }
  const sorted = [...section.items].sort((x, y) =>
    option.kind === "date"
      ? dateValue(y) - dateValue(x)
      : (option.text?.(x) ?? "").localeCompare(option.text?.(y) ?? "")
  );
  return isReversed ? sorted.reverse() : sorted;
}

type EntryParts = ReturnType<typeof entryColumns>;

interface TableColumn {
  /** The sort option this column's title triggers */
  key: string;
  label: string;
  value: (parts: EntryParts, item: Item) => string;

  /** Drawn smaller and grey, like a date */
  isMuted?: boolean;
}

const THREE_COLUMNS = "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.9fr)";

/** Experience, education and publications are listed as a table; null for the other sections */
function tableOf(
  section: Section
): { template: string; columns: TableColumn[] } | null {
  switch (section.type) {
    case "experience":
      return {
        template: THREE_COLUMNS,
        columns: [
          { key: "jobTitle", label: "Job title", value: (p) => p.title },
          {
            key: "organisation",
            label: "Organisation",
            value: (p) => p.organisation,
          },
          {
            key: "dates",
            label: "Dates",
            value: (p) => p.dates,
            isMuted: true,
          },
        ],
      };
    case "education":
      return {
        template: THREE_COLUMNS,
        columns: [
          { key: "degree", label: "Degree", value: (p) => p.title },
          {
            key: "institute",
            label: "Institute",
            value: (p) => p.organisation,
          },
          {
            key: "dates",
            label: "Dates",
            value: (p) => p.dates,
            isMuted: true,
          },
        ],
      };
    case "publications":
      return {
        template: "minmax(0, 1fr) 90px",
        columns: [
          {
            key: "title",
            label: "Publication",
            value: (_p, item) => item.fields.title ?? "",
          },
          {
            key: "year",
            label: "Year",
            value: (_p, item) => item.fields.year ?? "",
            isMuted: true,
          },
        ],
      };
    case "awards":
      return {
        template: "minmax(0, 1fr) 90px",
        columns: [
          {
            key: "title",
            label: "Award",
            value: (_p, item) => item.fields.title ?? "",
          },
          {
            key: "date",
            label: "Date",
            value: (p) => p.dates,
            isMuted: true,
          },
        ],
      };
    case "skills":
      return {
        template: "minmax(0, 1fr) minmax(0, 2fr)",
        columns: [
          {
            key: "category",
            label: "Category",
            value: (_p, item) => item.fields.category ?? "",
          },
          {
            key: "skills",
            label: "Skills",
            value: (_p, item) =>
              item.bullets.map((bullet) => bullet.text).join(", "),
            isMuted: true,
          },
        ],
      };
    case "interests":
      return {
        template: "minmax(0, 1fr) minmax(0, 1.5fr)",
        columns: [
          {
            key: "title",
            label: "Interest",
            value: (_p, item) => item.fields.title ?? "",
          },
          {
            key: "detail",
            label: "Detail",
            value: (_p, item) => item.fields.detail ?? "",
            isMuted: true,
          },
        ],
      };
    case "projects":
      return {
        template: THREE_COLUMNS,
        columns: [
          { key: "title", label: "Title", value: (p) => p.title },
          { key: "role", label: "Role", value: (p) => p.organisation },
          {
            key: "dates",
            label: "Dates",
            value: (p) => p.dates,
            isMuted: true,
          },
        ],
      };
    case "certifications":
    case "volunteering":
    case "custom":
      return {
        template: THREE_COLUMNS,
        columns: [
          { key: "title", label: "Title", value: (p) => p.title },
          {
            key: "subtitle",
            label: "Subtitle",
            value: (p) => p.organisation,
          },
          {
            key: "dates",
            label: "Dates",
            value: (p) => p.dates,
            isMuted: true,
          },
        ],
      };
    default:
      return null;
  }
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
  const options = sortOptionsOf(section);
  const [sortKey, setSortKey] = useState<string>("");
  const sort = options.find((entry) => entry.key === sortKey) ?? options[0];
  const [isReversed, setIsReversed] = useState(false);
  const itemId = route.kind === "vault" ? (route.itemId ?? "") : "";
  const selected = selectedItemOf(section, itemId);
  const removing = section.items.find((item) => item.id === removingId);

  const draftFields = useDraftFields();
  const table = tableOf(section);
  const viewItems = sortedForView(section, sort, isReversed);

  function select(id: string): void {
    navigate({ kind: "vault", sectionId: section.id, itemId: id });
  }

  function add(): void {
    // Only one empty item at a time: open the existing empty one instead
    const empty = section.items.find(isEmptyItem);
    if (empty) {
      requestFocusOnNewItem(empty.id);
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
    requestFocusOnNewItem(item.id);
    select(item.id);
  }

  return (
    <>
      <SectionTitleField key={`title-${section.id}`} section={section} />
      {section.type === "unsorted" && <UnsortedPlacement section={section} />}
      {table && section.items.length > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr) 44px",
              sm: "minmax(0, 1fr) 40px",
            },
            borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
            borderLeft: "3px solid transparent",
          }}
        >
          <Box
            sx={{
              display: { xs: "flex", sm: "grid" },
              flexWrap: "wrap",
              gridTemplateColumns: table?.template,
              columnGap: 1.5,
              px: 1.5,
            }}
          >
            {table?.columns.map((column) => {
              const option = options.find((entry) => entry.key === column.key);
              const isActive = option !== undefined && option === sort;
              const isDescending =
                option?.kind === "date" ? !isReversed : isReversed;
              // Sorting needs at least two items; with fewer the header is only a heading
              if (!option || section.items.length < MIN_ITEMS_TO_SORT) {
                return (
                  <Box
                    key={column.key}
                    sx={{
                      py: 1,
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: WORKSPACE_COLORS.muted,
                    }}
                  >
                    {column.label}
                  </Box>
                );
              }
              return (
                <ButtonBase
                  key={column.key}
                  aria-label={`Sort by ${column.label}${
                    isActive
                      ? ` (now ${SORT_DIRECTION_HINTS[option.kind][isReversed ? 1 : 0]})`
                      : ""
                  }`}
                  onClick={() => {
                    if (isActive) {
                      setIsReversed((value) => !value);
                    } else {
                      setSortKey(column.key);
                      setIsReversed(false);
                    }
                  }}
                  sx={{
                    justifyContent: "flex-start",
                    gap: 0.5,
                    py: 1,
                    minWidth: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: isActive
                      ? WORKSPACE_COLORS.text
                      : WORKSPACE_COLORS.muted,
                    "&:hover": { color: WORKSPACE_COLORS.text },
                  }}
                >
                  <span>{column.label}</span>
                  {isActive &&
                    (isDescending ? (
                      <ArrowDownwardOutlinedIcon sx={{ fontSize: 14 }} />
                    ) : (
                      <ArrowUpwardOutlinedIcon sx={{ fontSize: 14 }} />
                    ))}
                </ButtonBase>
              );
            })}
          </Box>
          <span />
        </Box>
      )}
      <Box
        component="ul"
        aria-label="Items"
        sx={{ listStyle: "none", m: 0, p: 0 }}
      >
        {viewItems.map((item) => {
          const isSelected = selected?.id === item.id;
          const shown = withDraft(item, draftFields);
          const title =
            datedTitle(
              getItemLabel(shown, Infinity),
              shown.fields.startDate,
              shown.fields.endDate,
              (day) => dayjs(day).format(dateFormat)
            ) || "(untitled)";
          const columns = entryColumns(shown, (day) =>
            dayjs(day).format(dateFormat)
          );
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
                  whiteSpace: { xs: "normal", sm: "nowrap" },
                  ...(table && {
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "minmax(0, 1fr)",
                      sm: table.template,
                    },
                    rowGap: { xs: 0.25, sm: 0 },
                    columnGap: 1.5,
                    alignItems: "center",
                  }),
                }}
              >
                {table
                  ? table.columns.map((column, position) => (
                      <Box
                        key={column.key}
                        component="span"
                        sx={{
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: { xs: "clip", sm: "ellipsis" },
                          overflowWrap: { xs: "anywhere", sm: "normal" },
                          ...(position > 0 && { fontWeight: 400 }),
                          ...(column.isMuted && {
                            fontSize: 13,
                            color: WORKSPACE_COLORS.muted,
                          }),
                        }}
                      >
                        {column.value(columns, shown)}
                      </Box>
                    ))
                  : title}
              </Box>
              <IconButton
                aria-label={`Delete ${title}`}
                onClick={() => setRemovingId(item.id)}
                sx={{
                  minWidth: { xs: 44, sm: 0 },
                  minHeight: { xs: 44, sm: 0 },
                }}
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
