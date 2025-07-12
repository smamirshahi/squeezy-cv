import { Box, Divider, IconButton, Rating, TextField } from "@mui/material";
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
  } = useEditorSkills({ setNewSkills });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {newSkills.map((skill) => (
        <Box
          key={skill.id}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          {/* Skill Category */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Skill Category"
              value={skill.category}
              onChange={(e) =>
                updateSkillCategory(skill.id, { category: e.target.value })
              }
              fullWidth
            />

            <IconButton onClick={() => removeSkillCategory(skill.id)}>
              <DeleteIcon />
            </IconButton>
          </Box>

          {/* Skill Items */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
            {skill.items.map((item, index) => (
              <Box
                key={item.id}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
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
            <Box>
              <IconButton onClick={() => addSkillItem(skill.id)}>
                <AddIcon />
              </IconButton>
            </Box>
          </Box>
          <Divider />
        </Box>
      ))}
    </Box>
  );
}
