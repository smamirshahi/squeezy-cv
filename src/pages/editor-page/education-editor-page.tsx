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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEditorPageUpdate } from "@src/hooks/use-editor-page-update";

export function EducationEditorPage() {
  const { educations, addEducation, removeEducation, updateEducation } =
    useEditorPageUpdate();

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Education
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {educations.map((edu) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Degree"
                  value={edu.degree}
                  onChange={(event) =>
                    updateEducation(edu.id, "degree", event.target.value)
                  }
                  fullWidth
                />
                <IconButton onClick={() => removeEducation(edu.id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              {/* Company and Location in one line */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Institute"
                  value={edu.institute}
                  onChange={(event) =>
                    updateEducation(edu.id, "institute", event.target.value)
                  }
                  fullWidth
                />
                <TextField
                  label="Location"
                  value={edu.location}
                  onChange={(event) =>
                    updateEducation(edu.id, "location", event.target.value)
                  }
                  fullWidth
                />
              </Box>
              {/* Start and End Date in one line */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={edu.startDate}
                  onChange={(event) =>
                    updateEducation(edu.id, "startDate", event.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={edu.endDate}
                  onChange={(event) =>
                    updateEducation(edu.id, "endDate", event.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <TextField
                label="Dissertation Title"
                value={edu.dissertationTitle}
                onChange={(event) =>
                  updateEducation(
                    edu.id,
                    "dissertationTitle",
                    event.target.value
                  )
                }
                fullWidth
              />
            </Box>
          ))}

          <Button variant="contained" onClick={() => addEducation()}>
            Add Education
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
