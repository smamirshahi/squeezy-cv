import {
  Checkbox as MuiCheckbox,
  CheckboxProps as MuiCheckboxProps,
  CircularProgress as MuiCircularProgress,
  Dialog as MuiDialog,
  DialogProps as MuiDialogProps,
  Divider as MuiDivider,
  FormControl as MuiFormControl,
  FormControlLabel as MuiFormControlLabel,
  FormControlLabelProps as MuiFormControlLabelProps,
  FormControlProps as MuiFormControlProps,
  Link as MuiLink,
  LinkProps as MuiLinkProps,
  Paper as MuiPaper,
  PaperProps as MuiPaperProps,
  Radio as MuiRadio,
  RadioProps as MuiRadioProps,
  Select as MuiSelect,
  SelectProps as MuiSelectProps,
  Switch as MuiSwitch,
  SwitchProps as MuiSwitchProps,
  TextField as MuiTextField,
  TextFieldProps as MuiTextFieldProps,
  ToggleButtonGroup as MuiToggleButtonGroup,
  ToggleButtonGroupProps as MuiToggleButtonGroupProps,
  Typography as MuiTypography,
  TypographyProps as MuiTypographyProps,
} from "@mui/material";
import { forwardRef } from "react";

/**
 * The design language in types: each wrapper below allows only the looks the app uses, so a new
 * variant, size or colour cannot slip in at a place of use. To add one, add it here (and, if it
 * needs styling, in the theme, `custom-styles/theme.tsx`). See `docs/design-language.md`.
 */
type ControlSize = "small" | "medium";
type Narrow<P, N> = Omit<P, keyof N> & N;
type AsProps = { component?: React.ElementType };

// ---------- Text ----------

type TextVariant =
  | "body1"
  | "body2"
  | "caption"
  | "subtitle1"
  | "subtitle2"
  | "overline"
  | "h4"
  | "h5"
  | "h6";

export type TypographyProps = Narrow<
  MuiTypographyProps,
  { variant?: TextVariant }
> &
  AsProps;

/** All text. Pick the variant, never set font sizes by hand. */
export const Typography = forwardRef<HTMLElement, TypographyProps>(
  function Typography(props, ref) {
    return <MuiTypography ref={ref} {...props} />;
  }
);

export type LinkProps = Narrow<
  MuiLinkProps,
  {
    underline?: "none" | "hover" | "always";
    color?: "inherit" | "primary" | "secondary" | "error" | "text.secondary";
  }
> &
  AsProps;

/** A text link (or a button that looks like one: `component="button"`). */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(
  function Link(props, ref) {
    return <MuiLink ref={ref} {...props} />;
  }
);

// ---------- Form fields ----------

export type TextFieldProps = Narrow<
  MuiTextFieldProps,
  { variant?: "outlined" | "standard"; size?: ControlSize }
>;

/** A text input: outlined, small or medium. */
export const TextField = forwardRef<HTMLDivElement, TextFieldProps>(
  function TextField(props, ref) {
    return <MuiTextField ref={ref} {...props} />;
  }
);

export type SelectProps<Value = unknown> = Narrow<
  MuiSelectProps<Value>,
  { variant?: "outlined" | "standard"; size?: ControlSize }
>;

/** A dropdown. Put it in a `FormControl` with an `InputLabel`. */
export function Select<Value = unknown>(
  props: SelectProps<Value>
): JSX.Element {
  return <MuiSelect {...props} />;
}

export type FormControlProps = Narrow<
  MuiFormControlProps,
  { size?: ControlSize }
>;

export const FormControl = forwardRef<HTMLDivElement, FormControlProps>(
  function FormControl(props, ref) {
    return <MuiFormControl ref={ref} {...props} />;
  }
);

export type CheckboxProps = Narrow<MuiCheckboxProps, { size?: ControlSize }>;

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  function Checkbox(props, ref) {
    return <MuiCheckbox ref={ref} {...props} />;
  }
);

export type RadioProps = Narrow<MuiRadioProps, { size?: ControlSize }>;

export const Radio = forwardRef<HTMLButtonElement, RadioProps>(
  function Radio(props, ref) {
    return <MuiRadio ref={ref} {...props} />;
  }
);

export type SwitchProps = Narrow<MuiSwitchProps, { size?: ControlSize }>;

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch(props, ref) {
    return <MuiSwitch ref={ref} {...props} />;
  }
);

export type FormControlLabelProps = MuiFormControlLabelProps;

export const FormControlLabel = forwardRef<
  HTMLLabelElement,
  FormControlLabelProps
>(function FormControlLabel(props, ref) {
  return <MuiFormControlLabel ref={ref} {...props} />;
});

export type ToggleButtonGroupProps = Narrow<
  MuiToggleButtonGroupProps,
  { size?: ControlSize; color?: "primary" | "secondary" | "standard" }
>;

export const ToggleButtonGroup = forwardRef<
  HTMLDivElement,
  ToggleButtonGroupProps
>(function ToggleButtonGroup(props, ref) {
  return <MuiToggleButtonGroup ref={ref} {...props} />;
});

// ---------- Surfaces ----------

export type PaperProps = Narrow<
  MuiPaperProps,
  { variant?: "outlined" | "elevation" }
> &
  AsProps;

/** A raised or outlined surface. */
export const Paper = forwardRef<HTMLDivElement, PaperProps>(
  function Paper(props, ref) {
    return <MuiPaper ref={ref} {...props} />;
  }
);

export type DialogProps = Narrow<
  MuiDialogProps,
  { maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false }
>;

/** A dialog. Widths: xs, sm, md, lg. */
export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  function Dialog(props, ref) {
    return <MuiDialog ref={ref} {...props} />;
  }
);

export type DividerProps = React.ComponentProps<typeof MuiDivider>;

export const Divider = forwardRef<HTMLHRElement, DividerProps>(
  function Divider(props, ref) {
    return <MuiDivider ref={ref} {...props} />;
  }
);

export type SpinnerProps = React.ComponentProps<typeof MuiCircularProgress>;

/** The loading spinner. */
export const CircularProgress = forwardRef<HTMLSpanElement, SpinnerProps>(
  function CircularProgress(props, ref) {
    return <MuiCircularProgress ref={ref} {...props} />;
  }
);
