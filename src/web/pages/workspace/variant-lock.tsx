import { ReactNode, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { describeLock } from "@shared/variant/variant-lock";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  duplicateVariant,
  isVariantReadOnly,
  unlockVariant,
  relockVariants,
} from "@store/variants/variants-slice";

/** What the lock of the active variant looks like right now */
export function useActiveVariantLock(): {
  isLocked: boolean;
  isReadOnly: boolean;
  isUnlockedByUser: boolean;
  text: string;
} {
  const variants = useAppSelector((s) => s.variants);
  const variant = useAppSelector(activeVariantSelector);
  const text = describeLock(variants.locks, variant.id);
  const isLocked = text !== "";
  const isReadOnly = isVariantReadOnly(variants, variant.id);
  return {
    isLocked,
    isReadOnly,
    isUnlockedByUser: isLocked && !isReadOnly,
    text,
  };
}

/** Disables every button and field inside while the active variant is read-only */
export function LockedFieldset({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { isReadOnly } = useActiveVariantLock();
  return (
    <Box
      component="fieldset"
      disabled={isReadOnly}
      sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}
    >
      {children}
    </Box>
  );
}

/** Asks before a sent variant can be edited. The sent copy and its PDF are never changed. */
export function UnlockDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const locks = useAppSelector((s) => s.variants.locks);
  const reasons = locks.byVariant[variant.id] ?? [];

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Unlock “{variant.name}”?</DialogTitle>
      <DialogContent>
        {reasons.length > 0 ? (
          <Typography sx={{ mb: 1 }}>
            This variant was sent to{" "}
            {reasons.map((r) => `${r.company} (${r.appliedAt})`).join(" and ")}.
          </Typography>
        ) : (
          <Typography sx={{ mb: 1 }}>
            An application file is damaged, so it is not known which variant it
            sent.
          </Typography>
        )}
        <Typography sx={{ mb: 1 }}>
          Unlocking lets you change this variant. The copy that was sent (the
          saved snapshot and its PDF) is <strong>not</strong> changed, but this
          variant will no longer match it.
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Safer: create a new variant from this one and edit that instead. It
          locks again when you save.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            dispatch(unlockVariant({ id: variant.id }));
            onClose();
          }}
        >
          Unlock anyway
        </Button>
        <Button
          variant="contained"
          autoFocus
          onClick={() => {
            dispatch(duplicateVariant({ sourceId: variant.id }));
            onClose();
          }}
        >
          Create new variant from this
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Shown under the top bar while the active variant was sent */
export function LockBanner(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const lock = useActiveVariantLock();
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  if (!lock.isLocked) {
    return null;
  }
  return (
    <>
      <Alert
        severity={lock.isReadOnly ? "info" : "warning"}
        icon={<LockIcon fontSize="small" />}
        sx={{ borderRadius: 0, py: 0 }}
        action={
          lock.isReadOnly ? (
            <>
              <Button
                size="small"
                color="inherit"
                onClick={() =>
                  dispatch(duplicateVariant({ sourceId: variant.id }))
                }
              >
                Create new variant from this
              </Button>
              <Button
                size="small"
                color="inherit"
                onClick={() => setIsDialogOpen(true)}
              >
                Unlock to edit
              </Button>
            </>
          ) : (
            <Button
              size="small"
              color="inherit"
              onClick={() => dispatch(relockVariants({ ids: [variant.id] }))}
            >
              Lock again
            </Button>
          )
        }
      >
        {lock.isReadOnly
          ? `This variant is locked because it was sent. ${lock.text} The vault is shared, so changes there still show here.`
          : "Unlocked for editing. It no longer matches what was sent; it locks again when you save."}
      </Alert>
      <UnlockDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
