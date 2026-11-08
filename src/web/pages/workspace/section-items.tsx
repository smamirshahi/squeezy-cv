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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import dayjs from "dayjs";
import { Item, Section } from "@custom-types/vault-types";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";
import { SectionTitleField } from "@pages/editor-page/sections/section-title-field";
import { UnsortedPlacement } from "@pages/workspace/unsorted-placement";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
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

/** What a new item of a section starts with */
function newItemFields(section: Section): Record<string, string> {
  switch (section.type) {
    case "experience":
      return {
        jobTitle: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
      };
    case "education":
      return {
        degree: "",
        institute: "",
        location: "",
        startDate: "",
        endDate: "",
      };
    case "skills":
      return { category: "" };
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
  section.type !== "experience" && section.type !== "education";

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
  const itemId = route.kind === "vault" ? (route.itemId ?? "") : "";
  const selected = selectedItemOf(section, itemId);
  const removing = section.items.find((item) => item.id === removingId);

  function select(id: string): void {
    navigate({ kind: "vault", sectionId: section.id, itemId: id });
  }

  function add(): void {
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
      <Box
        component="ul"
        aria-label="Items"
        sx={{ listStyle: "none", m: 0, p: 0 }}
      >
        {section.items.map((item, index) => {
          const isSelected = selected?.id === item.id;
          const title =
            datedTitle(
              getItemLabel(item),
              item.fields.startDate,
              item.fields.endDate,
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
