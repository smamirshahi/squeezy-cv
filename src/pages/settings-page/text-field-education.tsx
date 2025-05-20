import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  Paper,
  AccordionSummary,
  AccordionDetails,
  Accordion,
} from "@mui/material";
import { useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";

type WorkExperience = {
  id: number;
  degree: string;
  institute: string;
  location: string;
  startDate: string;
  endDate: string;
  dissertationTitle: string;
};

export function TextFieldEducation() {
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
        degree: "",
        institute: "",
        location: "",
        startDate: "",
        endDate: "",
        dissertationTitle: "",
      },
    ]);
  };

  const removeExperience = (id: number) => {
    setExperiences((prev) => prev.filter((exp) => exp.id !== id));
  };

  return (
    <Accordion>
      <AccordionSummary>Education</AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Typography variant="h6">Work Experience</Typography>

          {experiences.map((exp) => (
            <Paper key={exp.id} sx={{ padding: 2, position: "relative" }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", gap: 2 }}>
                  <TextField
                    label="Job Title"
                    value={exp.degree}
                    onChange={handleChange(exp.id, "degree")}
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
                    value={exp.institute}
                    onChange={handleChange(exp.id, "institute")}
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
              </Box>
            </Paper>
          ))}

          <Button variant="contained" onClick={addExperience}>
            Add Work Experience
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
