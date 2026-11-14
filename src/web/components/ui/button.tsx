import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  IconButton as MuiIconButton,
  IconButtonProps as MuiIconButtonProps,
} from "@mui/material";
import { forwardRef } from "react";

/** The only button looks the app has. A new look is added here, not at the place of use. */
type ButtonVariant = "contained" | "outlined" | "text";
/**
 * Emphasis comes from the variant, meaning from the colour:
 * - `contained` + primary: the one main action of a screen (filled orange)
 * - `outlined` + primary: a real secondary action (orange outline)
 * - `outlined` + neutral: the least important actions: Cancel, Close, See results (grey outline)
 * - secondary = AI (use `AiButton`), error = destructive
 */
type ButtonColor = "primary" | "secondary" | "error" | "neutral";
type ButtonSize = "small" | "medium" | "large";

/** What MUI allows when a button renders as a link (`component="a"` / `href`). */
type LinkProps = {
  component?: React.ElementType;
  href?: string;
  target?: string;
  rel?: string;
  download?: string;
};

export type ButtonProps = Omit<MuiButtonProps, "variant" | "color" | "size"> & {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
} & LinkProps;

/** The app's button. Import it from `@components/ui`, never from MUI. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(props, ref) {
    // neutral is MUI's "inherit"; the theme gives it the grey outline
    const { color, ...rest } = props;
    return (
      <MuiButton
        ref={ref}
        color={color === "neutral" ? "inherit" : color}
        {...rest}
      />
    );
  }
);

export type IconButtonProps = Omit<MuiIconButtonProps, "color" | "size"> & {
  color?: "default" | "inherit" | "primary" | "secondary" | "error";
  size?: ButtonSize;
} & LinkProps;

/** The app's icon-only button (give it an `aria-label`). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(props, ref) {
    return <MuiIconButton ref={ref} {...props} />;
  }
);
