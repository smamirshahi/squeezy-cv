import {
  Box,
  Button,
  IconButton,
  TextField,
  AccordionSummary,
  AccordionDetails,
  Accordion,
  Rating,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import {
  addSkillCategory,
  addSkillItem,
  removeSkillCategory,
  removeSkillItem,
  updateSkillCategory,
  updateSkillItem,
} from "@src/store/cv-data/cv-data-slice";
import { SetStateFunction, useAppDispatch } from "@src/store/store-helper";
import { isRatingAcceptable } from "@src/custom-types/type-guards";
import { SkillCategory } from "@src/custom-types/json-types";

interface Props {
  /** The skills to edit */
  skills: SkillCategory[];

  /** Setter for the skills to edit */
  setSkills: SetStateFunction<SkillCategory[]>;
}

export function SkillsEditorPage({ skills, setSkills }: Props) {
  const dispatch = useAppDispatch();

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Skills
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {skills.map((skill) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Skill Category"
                  value={skill.category}
                  onChange={(event) =>
                    dispatch(
                      updateSkillCategory({
                        id: skill.id,
                        key: "category",
                        value: event.target.value,
                      })
                    )
                  }
                  fullWidth
                />
                <IconButton
                  onClick={() => dispatch(removeSkillCategory(skill.id))}
                >
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
                        dispatch(
                          updateSkillItem({
                            id: skill.id,
                            index: idx,
                            key: "name",
                            value: event.target.value,
                          })
                        )
                      }
                      fullWidth
                    />
                    <Rating
                      value={skillItem.rating}
                      onChange={(_, newValue) => {
                        if (isRatingAcceptable(newValue)) {
                          dispatch(
                            updateSkillItem({
                              id: skill.id,
                              index: idx,
                              key: "rating",
                              value: newValue ?? 0,
                            })
                          );
                        }
                      }}
                      precision={0.5}
                    />
                    <IconButton
                      onClick={() =>
                        dispatch(
                          removeSkillItem({ skillId: skill.id, index: idx })
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
                    onClick={() =>
                      dispatch(addSkillItem({ skillId: skill.id }))
                    }
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          ))}

          <Button
            variant="contained"
            onClick={() => dispatch(addSkillCategory())}
          >
            Add New Skill Category
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
