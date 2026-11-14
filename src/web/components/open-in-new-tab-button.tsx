import { IconButton, Tooltip } from "@components/ui";
import { OpenInNewOutlined as OpenInNewOutlinedIcon } from "@components/ui/icons";

/** The address to open: `https://` is added when the text has none but looks like a web address; null otherwise */
function openableUrl(text: string): string | null {
  const url = text.trim();
  if (/^https?:\/\/\S+$/i.test(url)) {
    return url;
  }
  return /^[^\s/]+\.[^\s/]+(\/\S*)?$/.test(url) ? `https://${url}` : null;
}

/**
 * An icon button that opens a link in a new tab. Disabled (not hidden, so rows keep their layout)
 * while the text is not a web address.
 */
export function OpenInNewTabButton({
  url,
  label = "Open link in a new tab",
}: {
  url: string;
  label?: string;
}): JSX.Element {
  const href = openableUrl(url);
  const button = (
    <IconButton
      component="a"
      href={href ?? undefined}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      aria-disabled={href === null}
      disabled={href === null}
    >
      <OpenInNewOutlinedIcon />
    </IconButton>
  );
  return href === null ? (
    button
  ) : (
    <Tooltip title="Open in a new tab">{button}</Tooltip>
  );
}
