import { IconButton } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

/** The eye that shows or hides an entry or bullet in this job */
export function EyeToggle({
  isShown,
  label,
  onChange,
  isAccent,
}: {
  isShown: boolean;
  label: string;
  onChange: (isShown: boolean) => void;

  /** Draw the eye in the accent colour while shown, instead of grey */
  isAccent?: boolean;
}): JSX.Element {
  return (
    <IconButton
      size="small"
      color={isAccent && isShown ? "primary" : "default"}
      aria-label={`${isShown ? "Hide" : "Show"} ${label}`}
      aria-pressed={isShown}
      title={
        isShown ? "Shown on this CV. Click to hide." : "Hidden. Click to show."
      }
      onClick={() => onChange(!isShown)}
    >
      {isShown ? (
        <VisibilityIcon fontSize="small" />
      ) : (
        <VisibilityOffIcon fontSize="small" />
      )}
    </IconButton>
  );
}
