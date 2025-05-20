import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import { useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";

type WorkExperience = {
  id: number;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string[];
};

export function ExperienceForm() {
  const [experiences, setExperiences] = useState<WorkExperience[]>([]);

  const handleChange =
    (id: number, key: keyof WorkExperience) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setExperiences((prev) =>
        prev.map((exp) =>
          exp.id === id ? { ...exp, [key]: e.target.value } : exp
        )
      );
    };

  const addExperience = () => {
    setExperiences((prev) => [
      ...prev,
      {
        id: Date.now(),
        jobTitle: "",
        company: "",
        location: "",
        startDate: "",
        endDate: "",
        description: [""],
      },
    ]);
  };

  const removeExperience = (id: number) => {
    setExperiences((prev) => prev.filter((exp) => exp.id !== id));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h6">Work Experience</Typography>

      {experiences.map((exp) => (
        <Paper key={exp.id} sx={{ padding: 2, position: "relative" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Job Title"
                value={exp.jobTitle}
                onChange={handleChange(exp.id, "jobTitle")}
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
                onChange={handleChange(exp.id, "company")}
                fullWidth
              />
              <TextField
                label="Location"
                value={exp.location}
                onChange={handleChange(exp.id, "location")}
                fullWidth
              />
            </Box>
            {/* Start and End Date in one line */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Start Date"
                type="date"
                value={exp.startDate}
                onChange={handleChange(exp.id, "startDate")}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="End Date"
                type="date"
                value={exp.endDate}
                onChange={handleChange(exp.id, "endDate")}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>
            {/* Bullet Points for Description */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                mb: 2,
              }}
            >
              {exp.description.map((point, idx) => (
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
                    onChange={(e) => {
                      setExperiences((prev) =>
                        prev.map((ex) =>
                          ex.id === exp.id
                            ? {
                                ...ex,
                                description: ex.description.map((desc, i) =>
                                  i === idx ? e.target.value : desc
                                ),
                              }
                            : ex
                        )
                      );
                    }}
                    fullWidth
                  />
                  <IconButton
                    onClick={() => {
                      setExperiences((prev) =>
                        prev.map((ex) =>
                          ex.id === exp.id
                            ? {
                                ...ex,
                                description: ex.description.filter(
                                  (_, i) => i !== idx
                                ),
                              }
                            : ex
                        )
                      );
                    }}
                    disabled={exp.description.length === 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Box>
                <IconButton
                  onClick={() => {
                    setExperiences((prev) =>
                      prev.map((ex) =>
                        ex.id === exp.id
                          ? { ...ex, description: [...ex.description, ""] }
                          : ex
                      )
                    );
                  }}
                >
                  <span style={{ fontSize: 20 }}>➕</span>
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Paper>
      ))}

      <Button variant="contained" onClick={addExperience}>
        Add Work Experience
      </Button>
    </Box>
  );
}
