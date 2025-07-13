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
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  cvDataSelector,
  setSkills,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { useEffect, useState } from "react";
import { SkillCategory } from "@custom-types/skill-types";
import { useEditorSkills } from "@pages/editor-page/sections/editor-skills/use-editor-skills";
import { useEditorPage } from "@pages/editor-page/use-editor-page";
import { useRatingIcon } from "@hooks/use-rating-icon";
import { EditorAccordionHeader } from "@pages/editor-page/accordion/editor-accordion-header";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";

/** Shows the skill section in editor page */
export function EditorSkills(): JSX.Element {
  const dispatch = useAppDispatch();
  const { typography } = useAppSelector(styleSelector);
  const { skills } = useAppSelector(cvDataSelector);

  const [newSkills, setNewSkills] = useState<SkillCategory[]>([]);

  const RatingIcon = useRatingIcon();

  useEffect(() => {
    setNewSkills(skills);
  }, [skills, setNewSkills]);

  useEditorPage({
    onApplyChanges: () => {
      dispatch(setSkills(newSkills));
    },
    onDiscardChanges: () => {
      setNewSkills(skills);
    },
  });

  const {
    updateSkillCategory,
    removeSkillCategory,
    addSkillItem,
    updateSkillItem,
    removeSkillItem,
    swapSkillCategories,
    swapSkillItems,
  } = useEditorSkills({ setNewSkills });

  return (
    <>
      {newSkills.map((skill, index) => (
        <EditorAccordionHeader
          key={skill.id}
          accordionIndex={index}
          swapFunction={swapSkillCategories}
          removeFunction={removeSkillCategory}
          updateFunction={updateSkillCategory}
          title={skill.category}
          entity={{ id: skill.id, shouldShow: skill.shouldShow }}
          isLastEntity={index === newSkills.length - 1}
        >
          <AccordionDetails>
            {/* Skill Category */}
            <Box display="flex" flexDirection="row" gap={2}>
              <TextField
                label="Skill Category"
                value={skill.category}
                onChange={(e) =>
                  updateSkillCategory(skill.id, { category: e.target.value })
                }
                fullWidth
                sx={{ my: 2 }}
              />
              <IconButton onClick={() => addSkillItem(skill.id)}>
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
              {skill.items.map((item, itemIndex) => (
                <Box
                  key={item.id}
                  sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}
                >
                  <SortingIcons
                    index={itemIndex}
                    swapFunction={(fromIndex, toIndex) =>
                      swapSkillItems(skill.id, fromIndex, toIndex)
                    }
                    isLastEntity={skill.items.length - 1 === itemIndex}
                  />
                  <TextField
                    label={`Skill Item ${itemIndex + 1}`}
                    value={item.name}
                    onChange={(e) =>
                      updateSkillItem(skill.id, item.id, {
                        name: e.target.value,
                      })
                    }
                    sx={{ width: "50%" }}
                  />
                  <Rating
                    value={item.rating}
                    onChange={(_, newValue) => {
                      if (isRatingAcceptable(newValue)) {
                        updateSkillItem(skill.id, item.id, {
                          rating: newValue ?? 0,
                        });
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
                    onClick={() => removeSkillItem(skill.id, item.id)}
                    disabled={skill.items.length === 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </EditorAccordionHeader>
      ))}
    </>
  );
}
