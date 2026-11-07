import type { ComponentType } from "react";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
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
