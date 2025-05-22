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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type Education = {
  id: number;
  degree: string;
  institute: string;
  location: string;
  startDate: string;
  endDate: string;
  dissertationTitle: string;
};

export function EducationForm() {
  const [degrees, setDegrees] = useState<Education[]>([]);

  function handleChange<K extends keyof Education>(
    id: number,
    key: K,
    value: Education[K]
  ): void {
    setDegrees((prev) =>
      prev.map((degree) =>
        degree.id === id ? { ...degree, [key]: value } : degree
      )
    );
  }

  function addDegree(): void {
    setDegrees((prev) => [
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
  }

  function removeDegree(id: number): void {
    setDegrees((prev) => prev.filter((exp) => exp.id !== id));
  }

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Education
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {degrees.map((exp) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Degree"
                  value={exp.degree}
                  onChange={(event) =>
                    handleChange(exp.id, "degree", event.target.value)
                  }
                  fullWidth
                />
                <IconButton onClick={() => removeDegree(exp.id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
              {/* Company and Location in one line */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Institute"
                  value={exp.institute}
                  onChange={(event) =>
                    handleChange(exp.id, "institute", event.target.value)
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
            </Box>
          ))}

          <Button variant="contained" onClick={addDegree}>
            Add Education
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
