import { Experience } from "@custom-types/experience-types";
import { Box, TextField } from "@mui/material";

interface Props {
  experienceId: string;
  bulletPoints: string[];
  updateExperience: (id: string, update: Partial<Experience>) => void;
}

/** Bullet point section of experience */
export function EditorExperienceBp({
  experienceId,
  bulletPoints,
  updateExperience,
}: Props): JSX.Element {
  function buildDisplayValue(): string {
    return bulletPoints.map((p) => `• ${p}`).join("\n");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      updateExperience(experienceId, {
        bulletPoints: [...bulletPoints, ""],
      });
    }
  }

  function handleChange(newValue: string): void {
    // Remove bullets and split lines
    const lines = newValue.split("\n").map((line) => line.replace(/^•\s*/, ""));
    updateExperience(experienceId, { bulletPoints: lines });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <TextField
        label="Bullet Point List"
        multiline
        minRows={4}
        fullWidth
        value={buildDisplayValue()}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        variant="outlined"
        placeholder="Enter to add bullet, Shift+Enter for newline in bullet"
      />
    </Box>
  );
}
