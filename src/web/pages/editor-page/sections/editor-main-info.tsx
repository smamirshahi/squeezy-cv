import {
  Box,
  Button,
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
import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addLink,
  initialState,
  removeLink,
  setLinks,
  setProfile,
  updateLink,
  updateProfile,
  vaultSelector,
} from "@store/vault/vault-slice";
import { useVaultDraft } from "@pages/editor-page/use-vault-draft";
import { LinkTypeSelect } from "@pages/editor-page/link-type/link-type-select";
import {
  guessLinkTypeFromUrl,
  linkTypeById,
  linkTypeOfLabel,
  OTHER_LINK_TYPE_ID,
} from "@shared/vault/link-types";

/** Edits the name, headline, contact details and the list of links */
export function EditorMainInfo(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { profile, links } = useAppSelector(vaultSelector);

  const source = useMemo(
    () => ({ ...initialState, profile, links }),
    [profile, links]
  );

  const { draft, draftDispatch } = useVaultDraft(source, (applied) => {
    dispatch(setProfile(applied.profile));
    dispatch(setLinks(applied.links));
  });

  return (
    <>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
        }}
      >
        <TextField
          slotProps={{ inputLabel: { shrink: true } }}
          label="Full Name"
          placeholder="Jane Doe"
          variant="outlined"
          value={draft.profile.fullName}
          onChange={(event) =>
            draftDispatch(updateProfile({ fullName: event.target.value }))
          }
          fullWidth
        />
        <TextField
          slotProps={{ inputLabel: { shrink: true } }}
          label="Job Title"
          placeholder="Senior Software Engineer"
          variant="outlined"
          value={draft.profile.headline ?? ""}
          onChange={(event) =>
            draftDispatch(updateProfile({ headline: event.target.value }))
          }
          fullWidth
        />
        <TextField
          slotProps={{ inputLabel: { shrink: true } }}
          label="Right to work (optional)"
          placeholder="Eligible to work in the UK"
          helperText='e.g. "Eligible to work in the UK". Shown under your name when turned on in Style Settings.'
          variant="outlined"
          value={draft.profile.rightToWork ?? ""}
          onChange={(event) =>
            draftDispatch(updateProfile({ rightToWork: event.target.value }))
          }
          fullWidth
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          mb: 2,
        }}
      >
        <TextField
          label="Email"
          placeholder="jane.doe@example.com"
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
          placeholder="+44 7700 900123"
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
          placeholder="London, UK"
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

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6">Links</Typography>
      </Box>
      {draft.links.map((link) => (
        <Box
          key={link.id}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            my: 1,
          }}
        >
          <LinkTypeSelect
            value={linkTypeOfLabel(link.label).id}
            takenTypeIds={draft.links
              .filter((other) => other.id !== link.id)
              .map((other) => linkTypeOfLabel(other.label).id)}
            onChange={(typeId) =>
              draftDispatch(
                updateLink({
                  id: link.id,
                  update: {
                    // Other keeps a typed label; a known type writes its name
                    label:
                      typeId === OTHER_LINK_TYPE_ID
                        ? ""
                        : linkTypeById(typeId).label,
                  },
                })
              )
            }
          />
          {linkTypeOfLabel(link.label).id === OTHER_LINK_TYPE_ID && (
            <TextField
              label="Label"
              slotProps={{ inputLabel: { shrink: true } }}
              placeholder="Portfolio"
              value={link.label}
              onChange={(event) =>
                draftDispatch(
                  updateLink({
                    id: link.id,
                    update: { label: event.target.value },
                  })
                )
              }
              sx={{ width: "25%" }}
            />
          )}
          <TextField
            label="URL"
            slotProps={{ inputLabel: { shrink: true } }}
            placeholder={linkTypeOfLabel(link.label).urlHint}
            value={link.url}
            onChange={(event) => {
              const url = event.target.value;
              const update: { url: string; label?: string } = { url };
              // A pasted address of a known site picks the type if none is chosen yet
              if (link.label.trim() === "" && link.url.trim() === "") {
                const guess = guessLinkTypeFromUrl(url);
                if (guess.id !== OTHER_LINK_TYPE_ID) {
                  update.label = guess.label;
                }
              }
              draftDispatch(updateLink({ id: link.id, update }));
            }}
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
      <Button
        startIcon={<AddIcon />}
        onClick={() => draftDispatch(addLink({}))}
        sx={{ mt: 1 }}
      >
        Add new link
      </Button>
    </>
  );
}
