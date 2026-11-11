import { createContext, useContext } from "react";
import { Box, Typography } from "@mui/material";
import { LinkItem, Profile } from "@custom-types/vault-types";
import {
  HeaderWithPhoto,
  PersonalInfoPreviewPage,
} from "@pages/preview-page/personal-info-preview-page";
import { ContactInfoPreviewPage } from "@pages/preview-page/contact-info-preview-page";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

/** The element in the right panel that the Main Info page draws its header preview into */
export const MainInfoAsideContext = createContext<HTMLElement | null>(null);

export function useMainInfoAside(): HTMLElement | null {
  return useContext(MainInfoAsideContext);
}

/** Right panel of Main Info: the CV header drawn from what is typed (before Apply) */
export function MainInfoPreview({
  profile,
  links,
}: {
  profile: Profile;
  links: LinkItem[];
}): JSX.Element {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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
        On your CV
      </Typography>
      <Typography variant="body2" sx={{ color: WORKSPACE_COLORS.muted }}>
        Just a preview of what is in your vault. Nothing here goes on a job's CV
        unless you choose it.
      </Typography>
      <Box sx={{ bgcolor: "action.hover", p: 2, borderRadius: "6px" }}>
        <Box
          sx={{
            bgcolor: "#fff",
            color: "#222",
            p: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <HeaderWithPhoto profile={profile}>
            <PersonalInfoPreviewPage profile={profile} />
            <Box
              sx={{
                mt: 1,
                "& .MuiGrid-container": { columnGap: 2, rowGap: 1.25 },
              }}
            >
              <ContactInfoPreviewPage profile={profile} links={links} />
            </Box>
          </HeaderWithPhoto>
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: WORKSPACE_COLORS.muted }}>
        Everything you add here is kept in your vault. When you apply for a job,
        you decide which details to show (photo, links, nationality, marital
        status, gender, right to work). Optional details also need the template
        to turn them on (Templates &rsaquo; Design).
      </Typography>
    </Box>
  );
}
