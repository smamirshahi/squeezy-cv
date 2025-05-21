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
import AddIcon from "@mui/icons-material/Add";

type Skill = {
  id: number;
  category: string;
  items: {
    id: number;
    name: string;
    rate: number;
  }[];
};

// type Skill = {
//   skill: Skill2[];
// };

export function TextFieldSkills() {
  const [skills, setSkills] = useState<Skill[]>([]);

  function handleChange<K extends keyof Skill>(
    id: number,
    key: K,
    value: Skill[K]
  ): void {
    setSkills((prev) =>
      prev.map((skill) =>
        skill.id === id ? { ...skill, [key]: value } : skill
      )
    );
  }

  function handleSkillItemChange(
    id: number,
    index: number,
    value: string
  ): void {
    setSkills((prev) =>
      prev.map((skill) =>
        skill.id === id
          ? {
              ...skill,
              items: skill.items.map((item, i) =>
                i === index ? { ...item, name: value } : item
              ),
            }
          : skill
      )
    );
  }

  function addSkillCategory(): void {
    setSkills((prev) => [
      ...prev,
      {
        id: Date.now(),
        category: "",
        items: [
          {
            id: Date.now() * 2,
            name: "",
            rate: 0,
          },
        ],
      },
    ]);
  }

  function removeMainSkill(id: number): void {
    setSkills((prev) => prev.filter((skill) => skill.id !== id));
  }

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Skills
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {skills.map((skill) => (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="Skill Category"
                  value={skill.category}
                  onChange={(event) =>
                    handleChange(skill.id, "category", event.target.value)
                  }
                  fullWidth
                />
                <IconButton onClick={() => removeMainSkill(skill.id)}>
                  <DeleteIcon />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  mb: 2,
                }}
              >
                {skill.items.map((skillItem, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <TextField
                      label={`Skill Item ${idx + 1}`}
                      value={skillItem.name}
                      onChange={(event) =>
                        handleSkillItemChange(skill.id, idx, event.target.value)
                      }
                      fullWidth
                    />
                    <IconButton
                      onClick={() => {
                        setSkills((prev) =>
                          prev.map((s) =>
                            s.id === skill.id
                              ? {
                                  ...s,
                                  items: s.items.filter((_, i) => i !== idx),
                                }
                              : s
                          )
                        );
                      }}
                      disabled={skill.items.length === 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                <Box>
                  <IconButton
                    onClick={() => {
                      setSkills((prev) =>
                        prev.map((skill) =>
                          skill.id === skill.id
                            ? {
                                ...skill,
                                items: [
                                  ...skill.items,
                                  { id: Date.now(), name: "", rate: 0 },
                                ],
                              }
                            : skill
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

          <Button variant="contained" onClick={addSkillCategory}>
            Add New Skill Category
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
