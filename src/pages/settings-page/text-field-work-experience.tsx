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
  description: string;
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
        description: "",
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
          <IconButton
            onClick={() => removeExperience(exp.id)}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            <DeleteIcon />
          </IconButton>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Job Title"
              value={exp.jobTitle}
              onChange={handleChange(exp.id, "jobTitle")}
              fullWidth
            />
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
            <TextField
              label="Description"
              value={exp.description}
              onChange={handleChange(exp.id, "description")}
              fullWidth
              multiline
              minRows={4}
            />
          </Box>
        </Paper>
      ))}

      <Button variant="contained" onClick={addExperience}>
        Add Work Experience
      </Button>
    </Box>
  );
}
