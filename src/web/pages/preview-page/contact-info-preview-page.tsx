import {
  AlternateEmailOutlined as AlternateEmailIcon,
  LocationOnOutlined as LocationOnIcon,
  SmartphoneOutlined as SmartphoneIcon,
} from "@components/ui/icons";
import { Grid } from "@components/ui";
import { IconWithText } from "@components/icon-with-text";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { LinkItem, Profile } from "@custom-types/vault-types";
import { getLinkDisplayText } from "@shared/vault/link-utils";
import {
  OTHER_LINK_TYPE_ID,
  guessLinkTypeFromUrl,
  linkTypeOfLabel,
} from "@shared/vault/link-types";
import { linkTypeIconComponent } from "@pages/editor-page/link-type/link-type-icon";

/** The icon of a link: by its label (LinkedIn, Twitter...), else by the site in its URL */
function iconOfLink(link: LinkItem): React.ElementType {
  const byLabel = linkTypeOfLabel(link.label);
  const type =
    byLabel.id === OTHER_LINK_TYPE_ID
      ? guessLinkTypeFromUrl(link.url)
      : byLabel;
  return linkTypeIconComponent(type.id);
}

interface ContactInfoPreviewPageProps {
  profile: Profile;
  /** The links the job shows, in its order (none when the template hides them) */
  links: LinkItem[];
}

/** Contact Information (details) */
export function ContactInfoPreviewPage({
  profile,
  links,
}: ContactInfoPreviewPageProps): JSX.Element | null {
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
          icon={iconOfLink(link)}
          text={getLinkDisplayText(link.url, shouldShowFullContactLinks)}
        />
      ))}
    </Grid>
  );
}
