/**
 * Re-exports of MUI pieces the app uses as they are. This file and the other files in this folder
 * are the only places allowed to import MUI (ESLint enforces it), so switching or restyling a
 * component means changing it here. When a component needs a fixed look or a smaller set of
 * options, give it a wrapper of its own (see `button.tsx`) and remove it from this list.
 */
export {
  Autocomplete,
  Avatar,
  Box,
  ButtonBase,
  Collapse,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  FormLabel,
  Grid,
  InputAdornment,
  InputLabel,
  LinearProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Popover,
  RadioGroup,
  Rating,
  Slider,
  Stack,
  SvgIcon,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  ToggleButton,
  Tooltip,
  keyframes,
  useMediaQuery,
  useTheme,
} from "@mui/material";
export type { SxProps, Theme } from "@mui/material";
export { styled } from "@mui/material/styles";
export type { Breakpoint } from "@mui/material/styles";
