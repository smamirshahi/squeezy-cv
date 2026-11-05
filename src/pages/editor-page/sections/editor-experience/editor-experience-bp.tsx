import { Bullet } from "@custom-types/vault-types";
import { Box, TextField } from "@mui/material";
import { nanoid } from "@reduxjs/toolkit";
import { replaceBulletTexts } from "@store/vault/vault-utils";

interface Props {
  bullets: Bullet[];
  onChange: (bullets: Bullet[]) => void;
}

/** Bullet point section of experience, edited as one block of text */
export function EditorExperienceBp({ bullets, onChange }: Props): JSX.Element {
  function buildDisplayValue(): string {
    return bullets.map((b) => `• ${b.text}`).join("\n");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Enter") {
      event.preventDefault();
      onChange(
        replaceBulletTexts(bullets, [...bullets.map((b) => b.text), ""], nanoid)
      );
    }
  }

  function handleChange(newValue: string): void {
    // Remove bullets and split lines
    const lines = newValue.split("\n").map((line) => line.replace(/^•\s*/, ""));
    onChange(replaceBulletTexts(bullets, lines, nanoid));
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
