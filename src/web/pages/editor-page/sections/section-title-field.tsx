import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { Section } from "@custom-types/vault-types";
import { useAppDispatch } from "@store/store-helper";
import { removeSection, renameSection } from "@store/vault/vault-slice";

/** The title of one section (renamed at once) and a delete button that asks first */
export function SectionTitleField({
  section,
}: {
  section: Section;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const [isAsking, setIsAsking] = useState(false);

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <TextField
        label="Section title"
        size="small"
        value={section.title}
        onChange={(event) =>
          dispatch(renameSection({ id: section.id, title: event.target.value }))
        }
        sx={{ minWidth: 280 }}
      />
      <IconButton
        aria-label={`Delete section ${section.title}`}
        onClick={() => setIsAsking(true)}
      >
        <DeleteIcon />
      </IconButton>
      <Dialog open={isAsking} onClose={() => setIsAsking(false)}>
        <DialogTitle>Delete section?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            &quot;{section.title}&quot; and its {section.items.length} item(s)
            will be deleted. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAsking(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              dispatch(removeSection({ id: section.id }));
              setIsAsking(false);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
