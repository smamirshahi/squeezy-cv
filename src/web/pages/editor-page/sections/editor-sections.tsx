import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { SectionType } from "@custom-types/vault-types";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addSection,
  moveSection,
  removeSection,
  renameSection,
  sectionsSelector,
} from "@store/vault/vault-slice";
import {
  SECTION_TYPES,
  SECTION_TYPE_LABELS,
  getDefaultSectionTitle,
} from "@store/vault/section-types";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";

/**
 * Adds, renames, reorders and deletes the sections of the CV. Changes apply at once
 * (there is no Apply button on this page).
 */
export function EditorSections(): JSX.Element {
  const dispatch = useAppDispatch();
  const sections = useAppSelector(sectionsSelector);

  const [newType, setNewType] = useState<SectionType>("projects");
  const [newTitle, setNewTitle] = useState<string>("");
  const [idToDelete, setIdToDelete] = useState<string | null>(null);

  const sectionToDelete = sections.find((s) => s.id === idToDelete);

  function handleAdd(): void {
    const title = newTitle.trim() || getDefaultSectionTitle(newType);
    dispatch(addSection({ type: newType, title }));
    setNewTitle("");
  }

  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Sections
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Changes here apply immediately. The order is the order in the editor;
        where a section sits on the page is set under Page Structure.
      </Typography>

      {sections.map((section, index) => (
        <Box
          key={section.id}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            my: 1,
          }}
        >
          <SortingIcons
            index={index}
            swapFunction={(_from, toIndex) =>
              dispatch(moveSection({ id: section.id, toIndex }))
            }
            isLastEntity={index === sections.length - 1}
          />
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
          <Chip label={SECTION_TYPE_LABELS[section.type]} />
          <IconButton
            aria-label={`Delete section ${section.title}`}
            onClick={() => setIdToDelete(section.id)}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      ))}

      <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
        Add a section
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
        }}
      >
        <TextField
          select
          label="Type"
          value={newType}
          onChange={(event) => setNewType(event.target.value as SectionType)}
          sx={{ minWidth: 180 }}
        >
          {SECTION_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {SECTION_TYPE_LABELS[type]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="New section title"
          value={newTitle}
          placeholder={getDefaultSectionTitle(newType)}
          onChange={(event) => setNewTitle(event.target.value)}
          fullWidth
        />
        <Button variant="contained" onClick={handleAdd}>
          Add section
        </Button>
      </Box>

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
