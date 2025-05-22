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
  cvDataSelector,
  removeSkillCategory,
  removeSkillItem,
  updateSkillCategory,
  updateSkillItem,
} from "@src/store/applicant/applicant-slice";
import { useAppDispatch, useAppSelector } from "@src/store/store-helper";

export function SettingsSkills() {
  const dispatch = useAppDispatch();
  const { skills } = useAppSelector(cvDataSelector);

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
                        dispatch(
                          updateSkillItem({
                            id: skill.id,
                            index: idx,
                            key: "rating",
                            value: newValue ?? 0,
                          })
                        );
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
