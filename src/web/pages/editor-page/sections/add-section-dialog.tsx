import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ListItemText,
  MenuItem,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { SectionType } from "@custom-types/vault-types";
import { useAppDispatch } from "@store/store-helper";
import { addSection } from "@store/vault/vault-slice";
import {
  ADD_SECTION_OPTIONS,
  getDefaultSectionTitle,
} from "@store/vault/section-types";

/** A "+ Add section" button that opens a small form: type and title */
export function AddSectionButton(): JSX.Element {
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<SectionType>("custom");
  const [title, setTitle] = useState("");

  function handleAdd(): void {
    dispatch(
      addSection({ type, title: title.trim() || getDefaultSectionTitle(type) })
    );
    setTitle("");
    setIsOpen(false);
  }

  return (
    <>
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => setIsOpen(true)}
        sx={{ alignSelf: "flex-start" }}
      >
        Add section
      </Button>
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} fullWidth>
        <DialogTitle>Add a section</DialogTitle>
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}
        >
          <TextField
            select
            label="Type"
            value={type}
            onChange={(event) => setType(event.target.value as SectionType)}
            sx={{ mt: 1 }}
            slotProps={{
              select: {
                renderValue: (value) =>
                  ADD_SECTION_OPTIONS.find((option) => option.type === value)
                    ?.label ?? "",
              },
            }}
          >
            {ADD_SECTION_OPTIONS.map((option) => (
              <MenuItem key={option.type} value={option.type}>
                <ListItemText
                  primary={option.label}
                  secondary={option.description}
                  slotProps={{ secondary: { sx: { whiteSpace: "normal" } } }}
                />
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="New section title"
            value={title}
            placeholder={
              type === "custom"
                ? "e.g. Certifications, Awards"
                : getDefaultSectionTitle(type)
            }
            onChange={(event) => setTitle(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
