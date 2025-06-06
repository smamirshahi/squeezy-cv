import { Box, Button, IconButton, TextField } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEditorPageEducations } from "@hooks/use-editor-page-educations";
import { CVAccordion } from "@components/cv-accordion";
import { Education } from "@custom-types/json-types";
import { SetStateFunction } from "@store/store-helper";

interface Props {
  /** The educations to edit */
  educations: Education[];

  /** Setter for the educations to edit */
  setEducations: SetStateFunction<Education[]>;
}

export function EducationEditorPage({
  educations,
  setEducations,
}: Props): JSX.Element {
  const { addEducation, removeEducation, updateEducation } =
    useEditorPageEducations({ educations, setEducations });

  return (
    <CVAccordion title="Education">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {educations.map((education) => (
          <Box
            key={education.id}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Degree"
                value={education.degree}
                onChange={(event) =>
                  updateEducation(education.id, "degree", event.target.value)
                }
                fullWidth
              />
              <IconButton onClick={() => removeEducation(education.id)}>
                <DeleteIcon />
              </IconButton>
            </Box>
            {/* Company and Location in one line */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Institute"
                value={education.institute}
                onChange={(event) =>
                  updateEducation(education.id, "institute", event.target.value)
                }
                fullWidth
              />
              <TextField
                label="Location"
                value={education.location}
                onChange={(event) =>
                  updateEducation(education.id, "location", event.target.value)
                }
                fullWidth
              />
            </Box>
            {/* Start and End Date in one line */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={education.startDate}
                onChange={(event) =>
                  updateEducation(education.id, "startDate", event.target.value)
                }
                // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End Date"
                type="date"
                value={education.endDate}
                onChange={(event) =>
                  updateEducation(education.id, "endDate", event.target.value)
                }
                // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            <TextField
              label="Dissertation Title"
              value={education.dissertationTitle}
              onChange={(event) =>
                updateEducation(
                  education.id,
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
    </CVAccordion>
  );
}
