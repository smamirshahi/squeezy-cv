import { Box, Button, IconButton, TextField, Rating } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { isRatingAcceptable } from "@custom-types/type-guards";
import { useEditorPageSkills } from "@hooks/use-editor-page-skills";
import { CVAccordion } from "@components/cv-accordion";
import { SkillCategory } from "@custom-types/json-types";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  /** The educations to edit */
  skills: SkillCategory[];

  /** Setter for the educations to edit */
  setSkills: SetStateFunction<SkillCategory[]>;
}

export function SkillsEditorPage({ skills, setSkills }: Props): JSX.Element {
  const {
    addSkillCategory,
    removeSkillCategory,
    updateSkillCategory,
    addSkillItem,
    updateSkillItem,
    removeSkillItem,
  } = useEditorPageSkills({ skills, setSkills });

  return (
    <CVAccordion title="Skills">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {skills.map((skill) => (
          <Box
            key={skill.id}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Skill Category"
                value={skill.category}
                onChange={(event) =>
                  updateSkillCategory(skill.id, "category", event.target.value)
                }
                fullWidth
              />
              <IconButton onClick={() => removeSkillCategory(skill.id)}>
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
              {skill.items.map((skillItem, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <TextField
                    label={`Skill Item ${idx + 1}`}
                    value={skillItem.name}
                    onChange={(event) =>
                      updateSkillItem(skill.id, idx, "name", event.target.value)
                    }
                    fullWidth
                  />
                  <Rating
                    value={skillItem.rating}
                    onChange={(_, newValue) => {
                      if (isRatingAcceptable(newValue)) {
                        updateSkillItem(skill.id, idx, "rating", newValue ?? 0);
                      }
                    }}
                    precision={0.5}
                  />
                  <IconButton
                    onClick={() => removeSkillItem(skill.id, idx)}
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

        <Button variant="contained" onClick={() => addSkillCategory()}>
          Add New Skill Category
        </Button>
      </Box>
    </CVAccordion>
  );
}
