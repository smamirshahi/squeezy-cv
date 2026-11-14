import {
  Alert as MuiAlert,
  AlertProps as MuiAlertProps,
  Chip as MuiChip,
  ChipProps as MuiChipProps,
} from "@mui/material";
import { forwardRef } from "react";

type AlertSeverity = "error" | "warning" | "info" | "success";

export type AlertProps = Omit<MuiAlertProps, "severity"> & {
  severity?: AlertSeverity;
};

/** A message box. The four severities are the only ones. */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(
  function Alert(props, ref) {
    return <MuiAlert ref={ref} {...props} />;
  }
);

export type ChipProps = Omit<MuiChipProps, "size"> & {
  size?: "small" | "medium";
  component?: React.ElementType;
  href?: string;
};

/** A small label or tag. */
export const Chip = forwardRef<HTMLDivElement, ChipProps>(
  function Chip(props, ref) {
    return <MuiChip ref={ref} {...props} />;
  }
);
