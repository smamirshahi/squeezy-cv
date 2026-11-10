import {
  Autocomplete,
  Box,
  Button,
  MenuItem,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
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
import { NATIONALITIES } from "@shared/vault/nationalities";
import { RIGHT_TO_WORK_OPTIONS } from "@shared/vault/right-to-work-options";
import { GENDERS, MARITAL_STATUSES } from "@shared/vault/personal-options";
import { LocationAutocomplete } from "@pages/workspace/location-autocomplete";
import { JobTitleOptions } from "@pages/editor-page/sections/job-title-options";
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
          flexDirection: "column",
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
        <JobTitleOptions
          options={draft.profile.headlineOptions ?? []}
          onChange={(headlineOptions) =>
            draftDispatch(updateProfile({ headlineOptions }))
          }
        />
        <Autocomplete
          multiple
          options={[...NATIONALITIES]}
          value={draft.profile.nationalities ?? []}
          onChange={(_event, nationalities) =>
            draftDispatch(updateProfile({ nationalities }))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label="Nationality (optional)"
              placeholder="Start typing, e.g. British"
              helperText="Pick one or more. Shown under your name when turned on in Templates > Design."
              slotProps={{
                ...params.slotProps,
                inputLabel: { ...params.slotProps?.inputLabel, shrink: true },
              }}
            />
          )}
        />
        {(
          [
            ["maritalStatus", "Marital status (optional)", MARITAL_STATUSES],
            ["gender", "Gender (optional)", GENDERS],
          ] as const
        ).map(([key, label, choices]) => (
          <TextField
            key={key}
            select
            label={label}
            value={draft.profile[key] ?? ""}
            onChange={(event) =>
              draftDispatch(updateProfile({ [key]: event.target.value }))
            }
            helperText="Shown under your name when turned on in Templates > Design."
            slotProps={{
              inputLabel: { shrink: true },
              select: { displayEmpty: true },
            }}
          >
            <MenuItem value="">Not stated</MenuItem>
            {choices.map((choice) => (
              <MenuItem key={choice} value={choice}>
                {choice}
              </MenuItem>
            ))}
          </TextField>
        ))}
        <Autocomplete
          freeSolo
          options={[...RIGHT_TO_WORK_OPTIONS]}
          value={draft.profile.rightToWork ?? ""}
          inputValue={draft.profile.rightToWork ?? ""}
          onInputChange={(_event, rightToWork) =>
            draftDispatch(updateProfile({ rightToWork }))
          }
          filterOptions={(options) => options}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Right to work (optional)"
              placeholder="Type your own, or open the list for ready-made wordings"
              helperText="Shown under your name when turned on in Templates > Design."
              slotProps={{
                ...params.slotProps,
                inputLabel: { ...params.slotProps?.inputLabel, shrink: true },
                input: {
                  ...params.slotProps?.input,
                  startAdornment: (
                    <Tooltip title="Type any wording you like, or pick a ready-made one from the list (UK situations). A picked wording is only text: you can edit it afterwards, and replace anything in [brackets].">
                      <InfoOutlinedIcon
                        fontSize="small"
                        aria-label="About right to work"
                        sx={{ mr: 0.5, color: "text.secondary" }}
                      />
                    </Tooltip>
                  ),
                },
              }}
            />
          )}
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
        <LocationAutocomplete
          label="Location (city, country)"
          placeholder="London, United Kingdom"
          startAdornment={
            <InputAdornment position="start">
              <LocationOnIcon />
            </InputAdornment>
          }
          value={draft.profile.location ?? ""}
          onChange={(location) => draftDispatch(updateProfile({ location }))}
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
