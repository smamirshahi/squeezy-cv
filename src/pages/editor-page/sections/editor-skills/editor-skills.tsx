import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  IconButton,
  Rating,
  TextField,
  Typography,
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

/** Shows the skill section in editor page */
export function EditorSkills(): JSX.Element {
  const dispatch = useAppDispatch();
  const { typography } = useAppSelector(styleSelector);
  const { skills } = useAppSelector(cvDataSelector);

  const [newSkills, setNewSkills] = useState<SkillCategory[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);

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
  } = useEditorSkills({ setNewSkills });

  return (
    <>
      {newSkills.map((skill, index) => (
        <Accordion
          key={skill.id}
          sx={{ marginBottom: 2 }}
          expanded={selectedSkillId === skill.id}
          onChange={() =>
            setSelectedSkillId(selectedSkillId === skill.id ? null : skill.id)
          }
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`panel-${skill.id}-content`}
            id={`panel-${skill.id}-header`}
            sx={{ backgroundColor: "#f5f5f5" }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                pr: 1,
              }}
            >
              <Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    swapSkillCategories(index, index - 1);
                  }}
                  disabled={index === 0}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    swapSkillCategories(index, index + 1);
                  }}
                  disabled={index === newSkills.length - 1}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
                <Typography component="span">{skill.category}</Typography>
              </Box>
              <Box>
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    updateSkillCategory(skill.id, {
                      shouldShow: !skill.shouldShow,
                    });
                  }}
                >
                  {skill.shouldShow ? (
                    <VisibilityIcon />
                  ) : (
                    <VisibilityOffIcon />
                  )}
                </IconButton>

                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSkillCategory(skill.id);
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          </AccordionSummary>
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
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {skill.items.map((item, index) => (
                <Box
                  key={item.id}
                  sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}
                >
                  <TextField
                    label={`Skill Item ${index + 1}`}
                    value={item.name}
                    onChange={(e) =>
                      updateSkillItem(skill.id, item.id, {
                        name: e.target.value,
                      })
                    }
                    fullWidth
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
        </Accordion>
      ))}
    </>
  );
}
