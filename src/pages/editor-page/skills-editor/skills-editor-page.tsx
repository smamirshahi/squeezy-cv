import { Box, Button, IconButton, Rating, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { isRatingAcceptable } from "@custom-types/type-guards";
import {
  SetStateFunction,
  useAppDispatch,
  useAppSelector,
} from "@store/store-helper";
import {
  addSkillCategory,
  addSkillItem,
  removeSkillCategory,
  removeSkillItem,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { SkillIconDropdown } from "@pages/editor-page/skills-editor/skill-icon-dropdown";
import CircleIcon from "@mui/icons-material/Circle";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import CircleOutlinedIcon from "@mui/icons-material/CircleOutlined";
import StarBorderOutlinedIcon from "@mui/icons-material/StarBorderOutlined";
import { useMemo } from "react";
import { SkillCategory } from "@custom-types/skill-types";

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
  const dispatch = useAppDispatch();

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
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Skill Category"
              value={skill.category}
              onChange={(event) =>
                setNewSkills((prev) =>
                  prev.map((sk) =>
                    sk.id === skill.id
                      ? { ...sk, category: event.target.value }
                      : sk
                  )
                )
              }
              fullWidth
            />

            <IconButton onClick={() => dispatch(removeSkillCategory(skill.id))}>
              <DeleteIcon />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              mb: 2,
            }}
          >
            {skill.items.map((skillItem, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <TextField
                  label={`Skill Item ${index + 1}`}
                  value={skillItem.name}
                  onChange={(event) =>
                    setNewSkills((prev) =>
                      prev.map((sk) =>
                        sk.id === skill.id
                          ? {
                              ...sk,
                              items: sk.items.map((item, i) =>
                                i === index
                                  ? { ...item, name: event.target.value }
                                  : item
                              ),
                            }
                          : sk
                      )
                    )
                  }
                  fullWidth
                />
                <Rating
                  value={skillItem.rating}
                  onChange={(_, newValue) => {
                    if (isRatingAcceptable(newValue)) {
                      setNewSkills((prev) =>
                        prev.map((sk) =>
                          sk.id === skill.id
                            ? {
                                ...sk,
                                items: sk.items.map((item, i) =>
                                  i === index
                                    ? { ...item, rating: newValue ?? 0 }
                                    : item
                                ),
                              }
                            : sk
                        )
                      );
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
                  onClick={() =>
                    dispatch(
                      removeSkillItem({
                        skillId: skill.id,
                        skillItemId: skillItem.id,
                      })
                    )
                  }
                  disabled={skill.items.length === 1}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Box>
              <IconButton
                onClick={() => dispatch(addSkillItem({ skillId: skill.id }))}
              >
                <AddIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      ))}

      <Button variant="contained" onClick={() => dispatch(addSkillCategory())}>
        Add New Skill Category
      </Button>
    </Box>
  );
}
