import { Box, Button, IconButton, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { CVAccordion } from "@components/cv-accordion";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addBulletPoint,
  addExperience,
  cvDataSelector,
  removeBulletPoint,
  removeExperience,
  updateExperience,
  updateExperienceBulletPoint,
} from "@store/cv-data/cv-data-slice";

export function ExperienceEditorPage(): JSX.Element {
  const { experiences } = useAppSelector(cvDataSelector);
  const dispatch = useAppDispatch();

  return (
    <CVAccordion title="Work Experience">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {experiences.map((experience) => (
          <Box
            key={experience.id}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Job Title"
                value={experience.jobTitle}
                onChange={(event) =>
                  dispatch(
                    updateExperience({
                      experienceId: experience.id,
                      key: "jobTitle",
                      value: event.target.value,
                    })
                  )
                }
                fullWidth
              />
              <IconButton
                onClick={() => dispatch(removeExperience(experience.id))}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
            {/* Company and Location in one line */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Company"
                value={experience.company}
                onChange={(event) =>
                  dispatch(
                    updateExperience({
                      experienceId: experience.id,
                      key: "company",
                      value: event.target.value,
                    })
                  )
                }
                fullWidth
              />
              <TextField
                label="Location"
                value={experience.location}
                onChange={(event) =>
                  dispatch(
                    updateExperience({
                      experienceId: experience.id,
                      key: "location",
                      value: event.target.value,
                    })
                  )
                }
                fullWidth
              />
            </Box>
            {/* Start and End Date in one line */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={experience.startDate}
                onChange={(event) =>
                  dispatch(
                    updateExperience({
                      experienceId: experience.id,
                      key: "startDate",
                      value: event.target.value,
                    })
                  )
                }
                // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End Date"
                type="date"
                value={experience.endDate}
                onChange={(event) =>
                  dispatch(
                    updateExperience({
                      experienceId: experience.id,
                      key: "endDate",
                      value: event.target.value,
                    })
                  )
                }
                // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                mb: 2,
              }}
            >
              {experience.bulletPoints.map((point, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <TextField
                    label={`Bullet Point ${index + 1}`}
                    value={point}
                    onChange={(event) =>
                      dispatch(
                        updateExperienceBulletPoint({
                          experienceId: experience.id,
                          bulletPointId: index,
                          value: event.target.value,
                        })
                      )
                    }
                    fullWidth
                  />
                  <IconButton
                    onClick={() =>
                      dispatch(
                        removeBulletPoint({
                          experienceId: experience.id,
                          bulletPointId: index,
                        })
                      )
                    }
                    disabled={experience.bulletPoints.length === 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Box>
                <IconButton
                  onClick={() =>
                    dispatch(addBulletPoint({ experienceId: experience.id }))
                  }
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        ))}

        <Button variant="contained" onClick={() => dispatch(addExperience())}>
          Add Work Experience
        </Button>
      </Box>
    </CVAccordion>
  );
}
