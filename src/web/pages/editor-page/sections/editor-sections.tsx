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
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  removeSection,
  renameSection,
  sectionsSelector,
} from "@store/vault/vault-slice";

/**
 * Renames and deletes the sections of the CV. Changes apply at once
 * (there is no Apply button on this page).
 */
export function EditorSections(): JSX.Element {
  const dispatch = useAppDispatch();
  const sections = useAppSelector(sectionsSelector);

  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  const sectionToDelete = sections.find((s) => s.id === idToDelete);

  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Sections
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Rename or delete sections. Changes apply immediately. To add a section
        or set the order and place of sections on the page, use the Jobs page,
        "Sections & layout" tab.
      </Typography>

      {sections.map((section) => (
        <Box
          key={section.id}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            my: 1,
          }}
        >
          <TextField
            label="Section title"
            value={section.title}
            onChange={(event) =>
              dispatch(
                renameSection({ id: section.id, title: event.target.value })
              )
            }
            fullWidth
          />
          <IconButton
            aria-label={`Delete section ${section.title}`}
            onClick={() => setIdToDelete(section.id)}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}

      <Dialog open={!!sectionToDelete} onClose={() => setIdToDelete(null)}>
        <DialogTitle>Delete section?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            &quot;{sectionToDelete?.title}&quot; and its{" "}
            {sectionToDelete?.items.length ?? 0} item(s) will be deleted. This
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIdToDelete(null)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              if (idToDelete) {
                dispatch(removeSection({ id: idToDelete }));
              }
              setIdToDelete(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
