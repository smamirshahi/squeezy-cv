import { Box, Button, IconButton, Rating, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { isRatingAcceptable } from "@custom-types/type-guards";
import { SetStateFunction, useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { SkillIconDropdown } from "@pages/editor-page/skills-editor/skill-icon-dropdown";
import CircleIcon from "@mui/icons-material/Circle";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import { useMemo } from "react";
import { SkillCategory } from "@custom-types/skill-types";
import { useSkillsEditorPage } from "@pages/editor-page/skills-editor/skills-editor-page-utils";

interface Props {
  newSkills: SkillCategory[];
  setNewSkills: SetStateFunction<SkillCategory[]>;
}

/** Shows the skill section in editor page */
export function SkillsEditorPage({
  newSkills,
  setNewSkills,
}: Props): JSX.Element {
  const { ratingIcon, typography } = useAppSelector(styleSelector);

  const {
    updateSkillCategory,
    removeSkillCategory,
    addSkillCategory,
    updateSkillItem,
    removeSkillItem,
    addSkillItem,
  } = useSkillsEditorPage({ setNewSkills });

  const ratingIconComponent = useMemo(() => {
    switch (ratingIcon) {
      case "circle":
        return {
          icon: <CircleIcon fontSize="inherit" />,
          emptyIcon: <CircleOutlinedIcon fontSize="inherit" />,
        };

      case "star":
        return {
          icon: <StarBorderIcon fontSize="inherit" />,
          emptyIcon: <StarBorderOutlinedIcon fontSize="inherit" />,
        };
    }
  }, [ratingIcon]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <SkillIconDropdown />

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
                  icon={ratingIconComponent.icon}
                  emptyIcon={ratingIconComponent.emptyIcon}
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
        </Box>
      ))}

      <Button variant="contained" onClick={addSkillCategory}>
        Add New Skill Category
      </Button>
    </Box>
  );
}
