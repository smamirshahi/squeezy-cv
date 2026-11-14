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
} from "@components/ui";
import { DeleteOutlined as DeleteIcon } from "@components/ui/icons";
import { navigate } from "@hooks/navigation";
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
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
      <TextField
        label="Section title"
        size="small"
        value={section.title}
        onChange={(event) =>
          dispatch(renameSection({ id: section.id, title: event.target.value }))
        }
        fullWidth
      />
      {section.type !== "unsorted" && (
        <IconButton
          aria-label={`Delete section ${section.title}`}
          onClick={() => setIsAsking(true)}
        >
          <DeleteIcon />
        </IconButton>
      )}
      <Dialog open={isAsking} onClose={() => setIsAsking(false)}>
        <DialogTitle>Delete section?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {section.items.length === 0
              ? `"${section.title}" will be deleted. This cannot be undone.`
              : `"${section.title}" and its ${section.items.length} ${section.items.length === 1 ? "item" : "items"} will be deleted. This cannot be undone.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAsking(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              dispatch(removeSection({ id: section.id }));
              setIsAsking(false);
              navigate({ kind: "vault" });
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
