import {
  AccordionDetails,
  Box,
  IconButton,
  Rating,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { isRatingAcceptable } from "@custom-types/type-guards";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import {
  addBullet,
  moveBullet,
  removeBullet,
  updateBullet,
} from "@store/vault/vault-slice";
import {
  NewItemTemplate,
  useSectionDraft,
} from "@pages/editor-page/use-section-draft";
import { useRatingIcon } from "@hooks/use-rating-icon";
import { ItemExtras } from "@pages/editor-page/item-metadata/item-extras";
import { EditorAccordionHeader } from "@pages/editor-page/accordion/editor-accordion-header";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";

const NEW_SKILL_CATEGORY: NewItemTemplate = {
  fields: { category: "" },
  bullets: [{ text: "", rating: 0 }],
};

interface Props {
  /** Id of the skills section being edited */
  sectionId: string;
}

/** Shows the skill section in editor page */
export function EditorSkills({ sectionId }: Props): JSX.Element {
  const { typography } = useAppSelector(styleSelector);
  const RatingIcon = useRatingIcon();

  const {
    section,
    updateFields,
    removeItem,
    moveItem,
    setVisibility,
    draftDispatch,
  } = useSectionDraft(sectionId, NEW_SKILL_CATEGORY);

  const items = section?.items ?? [];

  return (
    <>
      {items.map((group, index) => (
        <EditorAccordionHeader
          key={group.id}
          accordionIndex={index}
          swapFunction={moveItem}
          removeFunction={removeItem}
          onVisibilityChange={setVisibility}
          title={group.fields.category ?? ""}
          entity={{ id: group.id, shouldShow: group.shouldShow }}
          isLastEntity={index === items.length - 1}
        >
          <AccordionDetails>
            {/* Skill Category */}
            <Box display="flex" flexDirection="row" gap={2}>
              <TextField
                label="Skill Category"
                value={group.fields.category ?? ""}
                onChange={(e) =>
                  updateFields(group.id, { category: e.target.value })
                }
                fullWidth
                sx={{ my: 2 }}
              />
              <IconButton
                onClick={() =>
                  draftDispatch(
                    addBullet({
                      sectionId,
                      itemId: group.id,
                      text: "",
                      rating: 0,
                    })
                  )
                }
              >
                <AddIcon />
              </IconButton>
            </Box>

            {/* Skill Items */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                mx: "20px",
              }}
            >
              {group.bullets.map((skill, skillIndex) => {
                const ref = {
                  sectionId,
                  itemId: group.id,
                  bulletId: skill.id,
                };
                return (
                  <Box
                    key={skill.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      my: 1,
                    }}
                  >
                    <SortingIcons
                      index={skillIndex}
                      swapFunction={(_fromIndex, toIndex) =>
                        draftDispatch(moveBullet({ ...ref, toIndex }))
                      }
                      isLastEntity={group.bullets.length - 1 === skillIndex}
                    />
                    <TextField
                      label={`Skill Item ${skillIndex + 1}`}
                      value={skill.text}
                      onChange={(e) =>
                        draftDispatch(
                          updateBullet({
                            ...ref,
                            update: { text: e.target.value },
                          })
                        )
                      }
                      sx={{ width: "50%" }}
                    />
                    <Rating
                      value={skill.rating ?? 0}
                      onChange={(_, newValue) => {
                        if (isRatingAcceptable(newValue)) {
                          draftDispatch(
                            updateBullet({
                              ...ref,
                              update: { rating: newValue ?? 0 },
                            })
                          );
                        }
                      }}
                      icon={RatingIcon.icon}
                      emptyIcon={RatingIcon.emptyIcon}
                      precision={0.5}
                      sx={{
                        ml: "20px",
                        "& .MuiRating-iconFilled": {
                          color: typography.icon.color,
                        },
                        "& .MuiRating-iconHover": {
                          color: typography.icon.color,
                        },
                      }}
                    />
                    <IconButton
                      onClick={() => draftDispatch(removeBullet(ref))}
                      disabled={group.bullets.length === 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                );
              })}
            </Box>
            <ItemExtras
              sectionId={sectionId}
              item={group}
              draftDispatch={draftDispatch}
            />
          </AccordionDetails>
        </EditorAccordionHeader>
      ))}
    </>
  );
}
