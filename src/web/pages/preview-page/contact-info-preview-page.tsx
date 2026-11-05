import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import LinkIcon from "@mui/icons-material/Link";
import { Grid } from "@mui/material";
import { IconWithText } from "@components/icon-with-text";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { vaultSelector } from "@store/vault/vault-slice";
import {
  LinkKind,
  getLinkDisplayText,
  getLinkKind,
} from "@shared/vault/link-utils";

const LINK_ICONS: Record<LinkKind, React.ElementType> = {
  linkedin: LinkedInIcon,
  github: GitHubIcon,
  generic: LinkIcon,
};

/** Contact Information (details) */
export function ContactInfoPreviewPage(): JSX.Element | null {
  const { profile, links } = useAppSelector(vaultSelector);
  const { shouldShowFullContactLinks } = useAppSelector(styleSelector);

  return (
    <Grid container direction="row">
      <IconWithText
        variant="bulletText"
        icon={AlternateEmailIcon}
        text={profile.email ?? ""}
      />
      <IconWithText
        variant="bulletText"
        icon={SmartphoneIcon}
        text={profile.phone ?? ""}
      />
      <IconWithText
        variant="bulletText"
        icon={LocationOnIcon}
        text={profile.location ?? ""}
      />

      {links.map((link) => (
        <IconWithText
          key={link.id}
          variant="bulletText"
          icon={LINK_ICONS[getLinkKind(link.url)]}
          text={getLinkDisplayText(link.url, shouldShowFullContactLinks)}
        />
      ))}
    </Grid>
  );
}
