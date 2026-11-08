import { Box, MenuItem, TextField, Typography } from "@mui/material";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { activeVariantSelector, setJobHeadline } from "@store/jobs/jobs-slice";
import { vaultSelector } from "@store/vault/vault-slice";

/** Which of the vault's job titles this job shows under the name */
export function JobHeadline(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  const titles = [
    ...new Set(
      [profile.headline ?? "", ...(profile.headlineOptions ?? [])]
        .map((title) => title.trim())
        .filter((title) => title !== "")
    ),
  ];

  if (titles.length < 2) {
    return null;
  }

  const chosen = variant.headline?.trim() || titles[0];

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.5,
        borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Job title</Typography>
      <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted, mb: 1 }}>
        The title shown under your name on this CV. Edit the list in the vault
        (Main Info).
      </Typography>
      <TextField
        select
        size="small"
        label="Job title for this job"
        value={titles.includes(chosen) ? chosen : titles[0]}
        onChange={(event) =>
          dispatch(
            setJobHeadline({
              jobId: variant.id,
              headline:
                event.target.value === titles[0]
                  ? undefined
                  : event.target.value,
            })
          )
        }
        sx={{ minWidth: 280 }}
      >
        {titles.map((title) => (
          <MenuItem key={title} value={title}>
            {title}
          </MenuItem>
        ))}
      </TextField>
    </Box>
  );
}
