import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import {
  RequirementGroup,
  RequirementsTable,
} from "@pages/workspace/requirements-table";

/** What the advert asks for, as the table, only to read */
export function RequirementsDialog({
  isOpen,
  onClose,
  groups,
}: {
  isOpen: boolean;
  onClose: () => void;
  groups: RequirementGroup[];
}): JSX.Element {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      aria-labelledby="advert-requirements-title"
    >
      <DialogTitle id="advert-requirements-title">
        What the advert asks for
      </DialogTitle>
      <DialogContent dividers>
        <RequirementsTable groups={groups} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
