import {
  Autocomplete,
  Box,
  Button,
  ButtonBase,
  MenuItem,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import { OpenInNewTabButton } from "@components/open-in-new-tab-button";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import {
  MainInfoPreview,
  useMainInfoAside,
} from "@pages/editor-page/sections/main-info-preview";
import { PhotoDialog } from "@pages/editor-page/sections/photo-dialog";
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

  const [isPhotoDialogOpen, setIsPhotoDialogOpen] = useState(false);

  const aside = useMainInfoAside();
  const { profile: p } = draft;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 760,
        mx: "auto",
        // Never shrink: the page scrolls and the sticky footer stays below all of it
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="h6" component="h1">
          Main info
        </Typography>
        <Typography variant="body2" sx={{ color: WORKSPACE_COLORS.muted }}>
          Facts about you. Written once, reused by every job. What a CV shows is
          decided by its template and job.
        </Typography>
      </Box>

      <InfoCard title="Identity">
        <Box
          sx={{
            display: "flex",
            // The photo sits above the fields where the room is narrow (phone, small laptop)
            flexDirection: { xs: "column", sm: "row", md: "column", lg: "row" },
            gap: 3,
            alignItems: "flex-start",
            "& > :last-child": {
              width: { xs: "100%", sm: "auto", md: "100%", lg: "auto" },
            },
          }}
        >
          <Box
            sx={{
              width: 120,
              flex: "none",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <ButtonBase
              onClick={() => setIsPhotoDialogOpen(true)}
              aria-label={p.photo ? "Edit photo" : "Add photo"}
              sx={{
                width: 120,
                height: 150,
                borderRadius: "6px",
                border: `1px solid ${WORKSPACE_COLORS.border}`,
                bgcolor: "action.hover",
                overflow: "hidden",
                color: WORKSPACE_COLORS.muted,
              }}
            >
              {p.photo ? (
                <Box
                  component="img"
                  src={p.photo}
                  alt="Your photo"
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <PersonOutlineIcon sx={{ fontSize: 56 }} />
              )}
            </ButtonBase>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Button
                variant="outlined"
                size="small"
                sx={{ flex: 1 }}
                onClick={() => setIsPhotoDialogOpen(true)}
              >
                {p.photo ? "Edit photo" : "Add photo"}
              </Button>
              <Tooltip title="Optional. Always cropped to a 4:5 frame so any picture fits.">
                <InfoOutlinedIcon
                  fontSize="small"
                  aria-label="About the photo"
                  sx={{ alignSelf: "center", color: "text.secondary" }}
                />
              </Tooltip>
            </Box>
            <PhotoDialog
              isOpen={isPhotoDialogOpen}
              photo={p.photo}
              photoSource={p.photoSource}
              photoCrop={p.photoCrop}
              onClose={() => setIsPhotoDialogOpen(false)}
              onApply={(result) => {
                draftDispatch(updateProfile(result));
                setIsPhotoDialogOpen(false);
              }}
            />
          </Box>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <TextField
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              label="Full Name"
              placeholder="Jane Doe"
              value={p.fullName}
              onChange={(event) =>
                draftDispatch(updateProfile({ fullName: event.target.value }))
              }
              fullWidth
            />
            <TextField
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              label="Job Title"
              placeholder="Senior Software Engineer"
              value={p.headline ?? ""}
              onChange={(event) =>
                draftDispatch(updateProfile({ headline: event.target.value }))
              }
              fullWidth
            />
            <JobTitleOptions
              options={p.headlineOptions ?? []}
              onChange={(headlineOptions) =>
                draftDispatch(updateProfile({ headlineOptions }))
              }
            />
          </Box>
        </Box>
      </InfoCard>

      <InfoCard title="Contact">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: TWO_COLUMNS,
            gap: 2,
          }}
        >
          <TextField
            size="small"
            label="Email"
            placeholder="jane.doe@example.com"
            slotProps={{ inputLabel: { shrink: true } }}
            value={p.email ?? ""}
            onChange={(event) =>
              draftDispatch(updateProfile({ email: event.target.value }))
            }
          />
          <TextField
            size="small"
            label="Phone"
            placeholder="+44 7700 900123"
            slotProps={{ inputLabel: { shrink: true } }}
            value={p.phone ?? ""}
            onChange={(event) =>
              draftDispatch(updateProfile({ phone: event.target.value }))
            }
          />
          <Box sx={{ gridColumn: SPAN_TWO }}>
            <LocationAutocomplete
              label="Location (city, country)"
              placeholder="London, United Kingdom"
              startAdornment={
                <InputAdornment position="start">
                  <LocationOnIcon />
                </InputAdornment>
              }
              value={p.location ?? ""}
              onChange={(location) =>
                draftDispatch(updateProfile({ location }))
              }
            />
          </Box>
        </Box>
      </InfoCard>

      <InfoCard title="Links">
        {draft.links.map((link) => (
          <Box
            key={link.id}
            sx={{
              display: "flex",
              flexWrap: { xs: "wrap", lg: "nowrap" },
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
                sx={{
                  width: { xs: "100%", sm: "25%", md: "100%", lg: "25%" },
                }}
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
              sx={{
                // Takes what is left of the row; below the desktop size it wraps with its buttons
                width: { xs: "auto", lg: "100%" },
                flex: { xs: "1 1 120px", lg: "0 1 auto" },
                minWidth: 0,
              }}
            />
            {/* The buttons have 8 px of padding of their own: pull them right so the icons line up with the card's 20 px edge */}
            <Box sx={{ display: "flex", flex: "none", gap: 0, mr: -1 }}>
              <OpenInNewTabButton
                url={link.url}
                label={`Open ${link.label || "link"} in a new tab`}
              />
              <IconButton
                aria-label="Remove link"
                onClick={() => draftDispatch(removeLink({ id: link.id }))}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        ))}
        <Box>
          <Button
            startIcon={<AddIcon />}
            onClick={() => draftDispatch(addLink({}))}
          >
            Add new link
          </Button>
        </Box>
      </InfoCard>

      <InfoCard
        title="Optional details"
        note="Shown under your name only when a template turns them on, in Templates > Design."
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: TWO_COLUMNS,
            gap: 2,
          }}
        >
          <Box sx={{ gridColumn: SPAN_TWO }}>
            <Autocomplete
              multiple
              size="small"
              options={[...NATIONALITIES]}
              value={p.nationalities ?? []}
              onChange={(_event, nationalities) =>
                draftDispatch(updateProfile({ nationalities }))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Nationality"
                  placeholder="Start typing, e.g. British"
                  slotProps={{
                    ...params.slotProps,
                    inputLabel: {
                      ...params.slotProps?.inputLabel,
                      shrink: true,
                    },
                  }}
                />
              )}
            />
          </Box>
          {(
            [
              ["maritalStatus", "Marital status", MARITAL_STATUSES],
              ["gender", "Gender", GENDERS],
            ] as const
          ).map(([key, label, choices]) => (
            <TextField
              key={key}
              select
              size="small"
              label={label}
              value={p[key] ?? ""}
              onChange={(event) =>
                draftDispatch(updateProfile({ [key]: event.target.value }))
              }
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
          <Box sx={{ gridColumn: SPAN_TWO }}>
            <Autocomplete
              freeSolo
              size="small"
              options={[...RIGHT_TO_WORK_OPTIONS]}
              value={p.rightToWork ?? ""}
              inputValue={p.rightToWork ?? ""}
              onInputChange={(_event, rightToWork) =>
                draftDispatch(updateProfile({ rightToWork }))
              }
              filterOptions={(options) => options}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Right to work"
                  placeholder="Type your own, or open the list for ready-made wordings"
                  slotProps={{
                    ...params.slotProps,
                    inputLabel: {
                      ...params.slotProps?.inputLabel,
                      shrink: true,
                    },
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
        </Box>
      </InfoCard>

      {aside &&
        createPortal(
          <MainInfoPreview profile={draft.profile} links={draft.links} />,
          aside
        )}
    </Box>
  );
}

/** Two columns of fields on a tablet and a desktop, one on a phone and a small laptop (narrow) */
const TWO_COLUMNS = {
  xs: "minmax(0, 1fr)",
  sm: "repeat(2, minmax(0, 1fr))",
  md: "minmax(0, 1fr)",
  lg: "repeat(2, minmax(0, 1fr))",
};
const SPAN_TWO = { xs: "auto", sm: "span 2", md: "auto", lg: "span 2" };

/** One titled group of fields on the Main Info page */
function InfoCard({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <Box
      component="section"
      aria-label={title}
      sx={{
        bgcolor: WORKSPACE_COLORS.panel,
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: "6px",
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box>
        <Typography
          component="h2"
          sx={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: WORKSPACE_COLORS.muted,
          }}
        >
          {title}
        </Typography>
        {note && (
          <Typography
            variant="caption"
            sx={{ color: WORKSPACE_COLORS.muted, display: "block", mt: 0.5 }}
          >
            {note}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}
