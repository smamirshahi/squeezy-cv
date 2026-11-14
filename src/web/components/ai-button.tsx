import { AutoAwesomeOutlined as AutoAwesomeOutlinedIcon } from "@components/ui/icons";
import { Box, Button, ButtonProps, Tooltip } from "@components/ui";

/**
 * The sparkle icon that marks everything that uses AI. Purple always means AI (the theme's
 * `secondary` colour), so use this icon and that colour wherever something talks to a model.
 */
export function AiIcon({
  fontSize = "small",
}: {
  fontSize?: "inherit" | "small" | "medium";
}): JSX.Element {
  return <AutoAwesomeOutlinedIcon aria-hidden="true" fontSize={fontSize} />;
}

/**
 * A button that asks an AI to do something: the AI icon and the AI colour. Use it for every button
 * that sends text to a model, so it is clear when AI is being used. Pass `startIcon` (for
 * example a spinner while it works) to replace the sparkle.
 */
export function AiButton({ startIcon, ...props }: ButtonProps): JSX.Element {
  return (
    <Button color="secondary" startIcon={startIcon ?? <AiIcon />} {...props} />
  );
}

/**
 * A small "AI" mark for text the AI wrote (a reworded description, bullets made from it), so it is
 * clear at a glance. It says so in a tooltip; the vault's own text never gets it.
 */
export function AiBadge({
  label = "Written by AI for this job",
}: {
  label?: string;
}): JSX.Element {
  return (
    <Tooltip title={label}>
      <Box
        component="span"
        role="img"
        aria-label={label}
        sx={{
          flex: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 0.25,
          height: 18,
          px: 0.5,
          borderRadius: 9,
          border: "1px solid var(--aib)",
          bgcolor: "var(--ais)",
          color: "var(--ait)",
          fontSize: 10.5,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        <AutoAwesomeOutlinedIcon aria-hidden="true" sx={{ fontSize: 11 }} />
        AI
      </Box>
    </Tooltip>
  );
}
