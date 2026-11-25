import type { ComponentType } from "react";
import {
  LinkOutlined as LinkOutlinedIcon,
  LinkedIn as LinkedInIcon,
  PublicOutlined as PublicOutlinedIcon,
} from "@components/ui/icons";
import {
  SiBehance,
  SiBitbucket,
  SiBluesky,
  SiDevdotto,
  SiDiscord,
  SiDribbble,
  SiFacebook,
  SiFigma,
  SiGithub,
  SiGitlab,
  SiGooglescholar,
  SiHashnode,
  SiHuggingface,
  SiInstagram,
  SiKaggle,
  SiLeetcode,
  SiMastodon,
  SiMedium,
  SiOrcid,
  SiPinterest,
  SiReddit,
  SiResearchgate,
  SiStackoverflow,
  SiSubstack,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiTwitch,
  SiWhatsapp,
  SiX,
  SiXing,
  SiYoutube,
} from "@icons-pack/react-simple-icons";

const ICON_SIZE = 20;

const ICONS: Record<
  string,
  ComponentType<{ size?: number; title?: string }>
> = {
  github: SiGithub,
  gitlab: SiGitlab,
  bitbucket: SiBitbucket,
  x: SiX,
  xing: SiXing,
  instagram: SiInstagram,
  facebook: SiFacebook,
  youtube: SiYoutube,
  tiktok: SiTiktok,
  threads: SiThreads,
  bluesky: SiBluesky,
  mastodon: SiMastodon,
  medium: SiMedium,
  devto: SiDevdotto,
  hashnode: SiHashnode,
  substack: SiSubstack,
  stackoverflow: SiStackoverflow,
  behance: SiBehance,
  dribbble: SiDribbble,
  figma: SiFigma,
  googlescholar: SiGooglescholar,
  researchgate: SiResearchgate,
  orcid: SiOrcid,
  kaggle: SiKaggle,
  leetcode: SiLeetcode,
  huggingface: SiHuggingface,
  discord: SiDiscord,
  telegram: SiTelegram,
  whatsapp: SiWhatsapp,
  twitch: SiTwitch,
  pinterest: SiPinterest,
  reddit: SiReddit,
};

/** The same icons without their built-in <title>, so no brand name lands in the CV's text */
const QUIET_ICONS: Record<string, React.ElementType> = Object.fromEntries(
  Object.entries(ICONS).map(([id, Icon]) => [
    id,
    (props: object) => <Icon {...props} title="" />,
  ])
);

/** The icon component of a link type (one 24x24 svg), for drawing it in the CV */
export function linkTypeIconComponent(typeId: string): React.ElementType {
  if (typeId === "linkedin") {
    return LinkedInIcon;
  }
  if (typeId === "website") {
    return PublicOutlinedIcon;
  }
  return QUIET_ICONS[typeId] ?? LinkOutlinedIcon;
}

/** The icon of a link type; a plain link icon for Other and unknown ids */
export function LinkTypeIcon({ typeId }: { typeId: string }): JSX.Element {
  let icon: JSX.Element;
  if (typeId === "linkedin") {
    // simple-icons dropped LinkedIn, so the MUI one is used
    icon = <LinkedInIcon sx={{ fontSize: ICON_SIZE }} />;
  } else if (typeId === "website") {
    icon = <PublicOutlinedIcon sx={{ fontSize: ICON_SIZE }} />;
  } else {
    const Icon = ICONS[typeId];
    icon = Icon ? (
      <Icon size={ICON_SIZE} title="" />
    ) : (
      <LinkOutlinedIcon sx={{ fontSize: ICON_SIZE }} />
    );
  }
  return (
    <span
      data-testid={`link-icon-${typeId}`}
      style={{ display: "inline-flex" }}
      aria-hidden
    >
      {icon}
    </span>
  );
}
