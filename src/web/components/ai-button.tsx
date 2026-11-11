import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { Button, ButtonProps } from "@mui/material";

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
