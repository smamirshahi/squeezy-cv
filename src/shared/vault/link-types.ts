/**
 * The kinds of link the editor offers in its dropdown. Pure data: the icons
 * are in the web app (`link-type-icons.tsx`). The vault still stores only
 * `label` + `url`; a link's type is worked out from its label.
 */

export interface LinkType {
  id: string;
  /** Written into the link's label when this type is chosen */
  label: string;
  /** Other labels that count as this type, lower case */
  aliases?: string[];
  /** Host names (no `www.`) used to guess the type from a pasted URL */
  domains?: string[];
  /** Example URL shown as a placeholder */
  urlHint: string;
}

/** Id of the "Other" option: the label is typed by hand */
export const OTHER_LINK_TYPE_ID = "other";

export const LINK_TYPES: LinkType[] = [
  {
    id: "website",
    label: "Website",
    aliases: ["portfolio", "personal website", "web", "homepage", "blog"],
    urlHint: "https://example.com",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    domains: ["linkedin.com"],
    urlHint: "https://linkedin.com/in/your-name",
  },
  {
    id: "github",
    label: "GitHub",
    domains: ["github.com"],
    urlHint: "https://github.com/your-name",
  },
  {
    id: "gitlab",
    label: "GitLab",
    domains: ["gitlab.com"],
    urlHint: "https://gitlab.com/your-name",
  },
  {
    id: "bitbucket",
    label: "Bitbucket",
    domains: ["bitbucket.org"],
    urlHint: "https://bitbucket.org/your-name",
  },
  {
    id: "x",
    label: "X",
    aliases: ["twitter", "x (twitter)", "twitter / x"],
    domains: ["x.com", "twitter.com"],
    urlHint: "https://x.com/your-name",
  },
  {
    id: "instagram",
    label: "Instagram",
    domains: ["instagram.com"],
    urlHint: "https://instagram.com/your-name",
  },
  {
    id: "facebook",
    label: "Facebook",
    domains: ["facebook.com", "fb.com"],
    urlHint: "https://facebook.com/your-name",
  },
  {
    id: "youtube",
    label: "YouTube",
    domains: ["youtube.com", "youtu.be"],
    urlHint: "https://youtube.com/@your-name",
  },
  {
    id: "tiktok",
    label: "TikTok",
    domains: ["tiktok.com"],
    urlHint: "https://tiktok.com/@your-name",
  },
  {
    id: "threads",
    label: "Threads",
    domains: ["threads.net"],
    urlHint: "https://threads.net/@your-name",
  },
  {
    id: "bluesky",
    label: "Bluesky",
    domains: ["bsky.app"],
    urlHint: "https://bsky.app/profile/your-name",
  },
  {
    id: "mastodon",
    label: "Mastodon",
    domains: ["mastodon.social"],
    urlHint: "https://mastodon.social/@your-name",
  },
  {
    id: "medium",
    label: "Medium",
    domains: ["medium.com"],
    urlHint: "https://medium.com/@your-name",
  },
  {
    id: "devto",
    label: "DEV",
    aliases: ["dev.to", "dev community"],
    domains: ["dev.to"],
    urlHint: "https://dev.to/your-name",
  },
  {
    id: "hashnode",
    label: "Hashnode",
    domains: ["hashnode.com"],
    urlHint: "https://hashnode.com/@your-name",
  },
  {
    id: "substack",
    label: "Substack",
    domains: ["substack.com"],
    urlHint: "https://your-name.substack.com",
  },
  {
    id: "stackoverflow",
    label: "Stack Overflow",
    aliases: ["stackoverflow"],
    domains: ["stackoverflow.com"],
    urlHint: "https://stackoverflow.com/users/123/your-name",
  },
  {
    id: "behance",
    label: "Behance",
    domains: ["behance.net"],
    urlHint: "https://behance.net/your-name",
  },
  {
    id: "dribbble",
    label: "Dribbble",
    domains: ["dribbble.com"],
    urlHint: "https://dribbble.com/your-name",
  },
  {
    id: "figma",
    label: "Figma",
    domains: ["figma.com"],
    urlHint: "https://figma.com/@your-name",
  },
  {
    id: "googlescholar",
    label: "Google Scholar",
    aliases: ["scholar"],
    domains: ["scholar.google.com"],
    urlHint: "https://scholar.google.com/citations?user=...",
  },
  {
    id: "researchgate",
    label: "ResearchGate",
    domains: ["researchgate.net"],
    urlHint: "https://researchgate.net/profile/your-name",
  },
  {
    id: "orcid",
    label: "ORCID",
    domains: ["orcid.org"],
    urlHint: "https://orcid.org/0000-0000-0000-0000",
  },
  {
    id: "kaggle",
    label: "Kaggle",
    domains: ["kaggle.com"],
    urlHint: "https://kaggle.com/your-name",
  },
  {
    id: "leetcode",
    label: "LeetCode",
    domains: ["leetcode.com"],
    urlHint: "https://leetcode.com/u/your-name",
  },
  {
    id: "huggingface",
    label: "Hugging Face",
    domains: ["huggingface.co"],
    urlHint: "https://huggingface.co/your-name",
  },
  {
    id: "discord",
    label: "Discord",
    domains: ["discord.com", "discord.gg"],
    urlHint: "https://discord.com/users/123",
  },
  {
    id: "telegram",
    label: "Telegram",
    domains: ["t.me", "telegram.me"],
    urlHint: "https://t.me/your-name",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    domains: ["wa.me", "whatsapp.com"],
    urlHint: "https://wa.me/447000000000",
  },
  {
    id: "twitch",
    label: "Twitch",
    domains: ["twitch.tv"],
    urlHint: "https://twitch.tv/your-name",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    domains: ["pinterest.com"],
    urlHint: "https://pinterest.com/your-name",
  },
  {
    id: "reddit",
    label: "Reddit",
    domains: ["reddit.com"],
    urlHint: "https://reddit.com/user/your-name",
  },
  {
    id: "other",
    label: "Other",
    urlHint: "https://",
  },
];

const OTHER_TYPE = LINK_TYPES.find((type) => type.id === OTHER_LINK_TYPE_ID)!;

/** The type with this id; unknown ids count as Other */
export function linkTypeById(id: string): LinkType {
  return LINK_TYPES.find((type) => type.id === id) ?? OTHER_TYPE;
}

/**
 * The type of a saved link, from its label (case-insensitive, also the
 * aliases such as "Twitter"). Anything else, including an empty label, is Other.
 */
export function linkTypeOfLabel(label: string): LinkType {
  const text = label.trim().toLowerCase();
  if (text === "") {
    return OTHER_TYPE;
  }
  return (
    LINK_TYPES.find(
      (type) =>
        type.id !== OTHER_LINK_TYPE_ID &&
        (type.label.toLowerCase() === text || type.aliases?.includes(text))
    ) ?? OTHER_TYPE
  );
}

/** Guesses the type from a pasted URL (github.com -> GitHub); Other when unknown */
export function guessLinkTypeFromUrl(url: string): LinkType {
  let host: string;
  try {
    host = new URL(url.trim()).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return OTHER_TYPE;
  }
  return (
    LINK_TYPES.find((type) =>
      type.domains?.some(
        (domain) => host === domain || host.endsWith(`.${domain}`)
      )
    ) ?? OTHER_TYPE
  );
}
