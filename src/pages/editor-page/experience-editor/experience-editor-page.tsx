import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { SetStateFunction } from "@store/store-helper";
import { Experience } from "@custom-types/experience-types";
import { nanoid } from "@reduxjs/toolkit";

interface Props {
  newExperiences: Experience[];
  setNewExperiences: SetStateFunction<Experience[]>;
}

/** Shows the experience in editor page */
export function ExperienceEditorPage({
  newExperiences,
  setNewExperiences,
}: Props): JSX.Element {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {newExperiences.map((experience) => (
        <Box
          key={experience.id}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Job Title"
              value={experience.jobTitle}
              onChange={(event) =>
                setNewExperiences((prev) =>
                  prev.map((exp) =>
                    exp.id === experience.id
                      ? { ...exp, jobTitle: event.target.value }
                      : exp
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={experience.shouldShow}
                  onChange={(event) =>
                    setNewExperiences((prev) =>
                      prev.map((exp) =>
                        exp.id === experience.id
                          ? { ...exp, shouldShow: event.target.checked }
                          : exp
                      )
                    )
                  }
                />
              }
              label="Show this experience"
            />

            <IconButton
              onClick={() =>
                setNewExperiences((prev) =>
                  prev.filter((exp) => exp.id !== experience.id)
                )
              }
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
                setNewExperiences((prev) =>
                  prev.map((exp) =>
                    exp.id === experience.id
                      ? { ...exp, company: event.target.value }
                      : exp
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Location"
              value={experience.location}
              onChange={(event) =>
                setNewExperiences((prev) =>
                  prev.map((exp) =>
                    exp.id === experience.id
                      ? { ...exp, location: event.target.value }
                      : exp
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Start and End Date in one line */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              type="date"
              label="Start Date"
              value={experience.startDate}
              onChange={(event) =>
                setNewExperiences((prev) =>
                  prev.map((exp) =>
                    exp.id === experience.id
                      ? { ...exp, startDate: event.target.value }
                      : exp
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="End Date"
              value={experience.endDate}
              onChange={(event) =>
                setNewExperiences((prev) =>
                  prev.map((exp) =>
                    exp.id === experience.id
                      ? { ...exp, endDate: event.target.value }
                      : exp
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
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
            {experience.bulletPoints.map((bulletPoint, index) => (
              <Box
                key={bulletPoint.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <TextField
                  label={`Bullet Point ${index + 1}`}
                  value={bulletPoint.text}
                  onChange={(event) =>
                    setNewExperiences((prev) =>
                      prev.map((exp) =>
                        exp.id === experience.id
                          ? {
                              ...exp,
                              bulletPoints: exp.bulletPoints.map((bp, i) =>
                                i === index
                                  ? { ...bp, text: event.target.value }
                                  : bp
                              ),
                            }
                          : exp
                      )
                    )
                  }
                  fullWidth
                  // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
                  InputLabelProps={{ shrink: true }}
                />

                <IconButton
                  onClick={() =>
                    setNewExperiences((prev) =>
                      prev.map((exp) =>
                        exp.id === experience.id
                          ? {
                              ...exp,
                              bulletPoints: exp.bulletPoints.filter(
                                (bp) => bp.id !== bulletPoint.id
                              ),
                            }
                          : exp
                      )
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
                  setNewExperiences((prev) =>
                    prev.map((exp) =>
                      exp.id === experience.id
                        ? {
                            ...exp,
                            bulletPoints: [
                              ...exp.bulletPoints,
                              { id: nanoid(), text: "" },
                            ],
                          }
                        : exp
                    )
                  )
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
        onClick={() =>
          setNewExperiences((prev) => [
            ...prev,
            {
              id: nanoid(),
              jobTitle: "",
              company: "",
              location: "",
              startDate: "",
              endDate: "",
              shouldShow: true,
              bulletPoints: [{ id: nanoid(), text: "" }],
            },
          ])
        }
      >
        Add Work Experience
      </Button>
    </Box>
  );
}
