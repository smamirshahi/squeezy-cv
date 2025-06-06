import { Box, Button, IconButton, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useEditorPageExperiences } from "@hooks/use-editor-page-experiences";
import { CVAccordion } from "@components/cv-accordion";

export function ExperienceEditorPage(): JSX.Element {
  const {
    experiences,
    addExperience,
    removeExperience,
    updateExperience,
    addBulletPoint,
    updateExperienceBulletPoint,
    removeBulletPoint,
  } = useEditorPageExperiences();

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
                  updateExperience(
                    experience.id,
                    "jobTitle",
                    event.target.value
                  )
                }
                fullWidth
              />
              <IconButton onClick={() => removeExperience(experience.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
            {/* Company and Location in one line */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Company"
                value={experience.company}
                onChange={(event) =>
                  updateExperience(experience.id, "company", event.target.value)
                }
                fullWidth
              />
              <TextField
                label="Location"
                value={experience.location}
                onChange={(event) =>
                  updateExperience(
                    experience.id,
                    "location",
                    event.target.value
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
                  updateExperience(
                    experience.id,
                    "startDate",
                    event.target.value
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
                  updateExperience(experience.id, "endDate", event.target.value)
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
                      updateExperienceBulletPoint(
                        experience.id,
                        index,
                        event.target.value
                      )
                    }
                    fullWidth
                  />
                  <IconButton
                    onClick={() => removeBulletPoint(experience.id, index)}
                    disabled={experience.bulletPoints.length === 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Box>
                <IconButton onClick={() => addBulletPoint(experience.id)}>
                  <AddIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        ))}

        <Button variant="contained" onClick={() => addExperience()}>
          Add Work Experience
        </Button>
      </Box>
    </CVAccordion>
  );
}
