import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@components/ui";
import { useViewport } from "@hooks/use-viewport";
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
  const isPhone = useViewport() === "phone";
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      fullScreen={isPhone}
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
