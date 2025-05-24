import {
  Box,
  Button,
  IconButton,
  TextField,
  AccordionSummary,
  AccordionDetails,
  Accordion,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEditorPageUpdate } from "@src/hooks/use-editor-page-update";

export function ExperienceEditorPage() {
  const {
    experiences,
    addExperience,
    removeExperience,
    updateExperience,
    addBulletPoint,
    updateExperienceBulletPoint,
    removeBulletPoint,
  } = useEditorPageUpdate();

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Work Experience
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {experiences.map((exp) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Job Title"
                  value={exp.jobTitle}
                  onChange={(event) =>
                    updateExperience(exp.id, "jobTitle", event.target.value)
                  }
                  fullWidth
                />
                <IconButton onClick={() => removeExperience(exp.id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              {/* Company and Location in one line */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Company"
                  value={exp.company}
                  onChange={(event) =>
                    updateExperience(exp.id, "company", event.target.value)
                  }
                  fullWidth
                />
                <TextField
                  label="Location"
                  value={exp.location}
                  onChange={(event) =>
                    updateExperience(exp.id, "location", event.target.value)
                  }
                  fullWidth
                />
              </Box>
              {/* Start and End Date in one line */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={exp.startDate}
                  onChange={(event) =>
                    updateExperience(exp.id, "startDate", event.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={exp.endDate}
                  onChange={(event) =>
                    updateExperience(exp.id, "endDate", event.target.value)
                  }
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
                {exp.bulletPoints.map((point, index) => (
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
                          exp.id,
                          index,
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                    <IconButton
                      onClick={() => removeBulletPoint(exp.id, index)}
                      disabled={exp.bulletPoints.length === 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Box>
                  <IconButton onClick={() => addBulletPoint(exp.id)}>
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
      </AccordionDetails>
    </Accordion>
  );
}
