import { Box, Button, IconButton, TextField, Rating } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { isRatingAcceptable } from "@custom-types/type-guards";
import { CVAccordion } from "@components/cv-accordion";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addSkillCategory,
  addSkillItem,
  cvDataSelector,
  removeSkillCategory,
  removeSkillItem,
  updateSkillItem,
} from "@store/cv-data/cv-data-slice";
import { UpdateSkillSection } from "@pages/editor-page/skills-editor/skills-section";

export function SkillsEditorPage(): JSX.Element {
  const { skills } = useAppSelector(cvDataSelector);
  const dispatch = useAppDispatch();

  return (
    <CVAccordion title="Skills">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {skills.map((skill) => (
          <Box
            key={skill.id}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <UpdateSkillSection skill={skill} />

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
                      dispatch(
                        updateSkillItem({
                          skillId: skill.id,
                          skillItemId: skillItem.id,
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
                            skillId: skill.id,
                            skillItemId: skillItem.id,
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

        <Button
          variant="contained"
          onClick={() => dispatch(addSkillCategory())}
        >
          Add New Skill Category
        </Button>
      </Box>
    </CVAccordion>
  );
}
