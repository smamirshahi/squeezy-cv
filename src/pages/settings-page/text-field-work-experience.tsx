import {
  Box,
  Button,
  IconButton,
  TextField,
  AccordionSummary,
  AccordionDetails,
  Accordion,
} from "@mui/material";
import { useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type WorkExperience = {
  id: number;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  bulletPoints: string[];
};

export function ExperienceForm() {
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);

  function handleChange<K extends keyof WorkExperience>(
    id: number,
    key: K,
    value: WorkExperience[K]
  ): void {
    setExperiences((prev) =>
      prev.map((experience) =>
        experience.id === id ? { ...experience, [key]: value } : experience
      )
    );
  }

  function handleBulletPointsChange(
    id: number,
    index: number,
    value: string
  ): void {
    setExperiences((prev) =>
      prev.map((experience) =>
        experience.id === id
          ? {
              ...experience,
              bulletPoints: experience.bulletPoints.map((desc, i) =>
                i === index ? value : desc
              ),
            }
          : experience
      )
    );
  }

  function addExperience(): void {
    setExperiences((prev) => [
      ...prev,
      {
        id: Date.now(),
        jobTitle: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        bulletPoints: [""],
      },
    ]);
  }

  function removeExperience(id: number): void {
    setExperiences((prev) => prev.filter((exp) => exp.id !== id));
  }

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
                    handleChange(exp.id, "jobTitle", event.target.value)
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
                    handleChange(exp.id, "company", event.target.value)
                  }
                  fullWidth
                />
                <TextField
                  label="Location"
                  value={exp.location}
                  onChange={(event) =>
                    handleChange(exp.id, "location", event.target.value)
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
                    handleChange(exp.id, "startDate", event.target.value)
                  }
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={exp.endDate}
                  onChange={(event) =>
                    handleChange(exp.id, "endDate", event.target.value)
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
                {exp.bulletPoints.map((point, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <TextField
                      label={`Bullet Point ${idx + 1}`}
                      value={point}
                      onChange={(event) =>
                        handleBulletPointsChange(
                          exp.id,
                          idx,
                          event.target.value
                        )
                      }
                      fullWidth
                    />
                    <IconButton
                      onClick={() => {
                        setExperiences((prev) =>
                          prev.map((experience) =>
                            experience.id === exp.id
                              ? {
                                  ...experience,
                                  bulletPoints: experience.bulletPoints.filter(
                                    (_, i) => i !== idx
                                  ),
                                }
                              : experience
                          )
                        );
                      }}
                      disabled={exp.bulletPoints.length === 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Box>
                  <IconButton
                    onClick={() => {
                      setExperiences((prev) =>
                        prev.map((experience) =>
                          experience.id === exp.id
                            ? {
                                ...experience,
                                bulletPoints: [...experience.bulletPoints, ""],
                              }
                            : experience
                        )
                      );
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </Box>
              </Box>
            </Box>
          ))}

          <Button variant="contained" onClick={addExperience}>
            Add Work Experience
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
