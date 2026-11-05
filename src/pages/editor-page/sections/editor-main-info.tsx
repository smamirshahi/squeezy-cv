import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useEffect, useMemo } from "react";
import { appSelector, setShouldAddNewItem } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addLink,
  initialState,
  moveLink,
  removeLink,
  setLinks,
  setProfile,
  updateLink,
  updateProfile,
  vaultSelector,
} from "@store/vault/vault-slice";
import { useVaultDraft } from "@pages/editor-page/use-vault-draft";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";

/** Edits the name, headline, contact details and the list of links */
export function EditorMainInfo(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { profile, links } = useAppSelector(vaultSelector);
  const { shouldAddNewItem } = useAppSelector(appSelector);

  const source = useMemo(
    () => ({ ...initialState, profile, links }),
    [profile, links]
  );

  const { draft, draftDispatch } = useVaultDraft(source, (applied) => {
    dispatch(setProfile(applied.profile));
    dispatch(setLinks(applied.links));
  });

  // The footer button "Add new link"
  useEffect(() => {
    if (shouldAddNewItem) {
      draftDispatch(addLink({}));
      dispatch(setShouldAddNewItem(false));
    }
  }, [dispatch, draftDispatch, shouldAddNewItem]);

  return (
    <>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Full Name"
          variant="outlined"
          value={draft.profile.fullName}
          onChange={(event) =>
            draftDispatch(updateProfile({ fullName: event.target.value }))
          }
          fullWidth
        />
        <TextField
          label="Job Title"
          variant="outlined"
          value={draft.profile.headline ?? ""}
          onChange={(event) =>
            draftDispatch(updateProfile({ headline: event.target.value }))
          }
          fullWidth
        />
      </Box>
      <Box display="flex" flexDirection="column" gap={2} mb={2}>
        <TextField
          label="Email"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <AlternateEmailIcon />
                </InputAdornment>
              ),
            },
          }}
          variant="outlined"
          value={draft.profile.email ?? ""}
          onChange={(event) =>
            draftDispatch(updateProfile({ email: event.target.value }))
          }
        />
        <TextField
          label="Phone"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SmartphoneIcon />
                </InputAdornment>
              ),
            },
          }}
          variant="outlined"
          value={draft.profile.phone ?? ""}
          onChange={(event) =>
            draftDispatch(updateProfile({ phone: event.target.value }))
          }
        />
        <TextField
          label="Location"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOnIcon />
                </InputAdornment>
              ),
            },
          }}
          variant="outlined"
          value={draft.profile.location ?? ""}
          onChange={(event) =>
            draftDispatch(updateProfile({ location: event.target.value }))
          }
        />
      </Box>

      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">Links</Typography>
        <IconButton
          aria-label="Add link"
          onClick={() => draftDispatch(addLink({}))}
        >
          <AddIcon />
        </IconButton>
      </Box>
      {draft.links.map((link, index) => (
        <Box
          key={link.id}
          display="flex"
          alignItems="center"
          gap={1}
          sx={{ my: 1 }}
        >
          <SortingIcons
            index={index}
            swapFunction={(_from, toIndex) =>
              draftDispatch(moveLink({ id: link.id, toIndex }))
            }
            isLastEntity={index === draft.links.length - 1}
          />
          <TextField
            label="Label"
            value={link.label}
            onChange={(event) =>
              draftDispatch(
                updateLink({
                  id: link.id,
                  update: { label: event.target.value },
                })
              )
            }
            sx={{ width: "30%" }}
          />
          <TextField
            label="URL"
            value={link.url}
            onChange={(event) =>
              draftDispatch(
                updateLink({ id: link.id, update: { url: event.target.value } })
              )
            }
            fullWidth
          />
          <IconButton
            aria-label="Remove link"
            onClick={() => draftDispatch(removeLink({ id: link.id }))}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
    </>
  );
}
