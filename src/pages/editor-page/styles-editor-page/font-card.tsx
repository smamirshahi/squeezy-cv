import { AvailableFonts, FontStyle } from "@custom-types/styles-types";
import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Typography,
  useTheme,
} from "@mui/material";
import { appSelector, setSelectedTypography } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { FontSizeDropdown } from "@pages/editor-page/font-editor/font-size-dropdown";
import { FontWeightDropdown } from "@pages/editor-page/font-editor/font-weight-dropdown";
import { FontColorSelector } from "@pages/editor-page/font-editor/font-color-selector";

interface Props {
  /** The variant of the font */
  variant: AvailableFonts;

  /** The style of the font */
  fontStyle: FontStyle;
}

export function FontCard({ variant, fontStyle }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { selectedTypography } = useAppSelector(appSelector);

  function onCardSelected(): void {
    selectedTypography === variant
      ? dispatch(setSelectedTypography(null))
      : dispatch(setSelectedTypography(variant));
  }

  return (
    <Card sx={{ width: "280px", m: "10px", border: "1px solid black" }}>
      <CardActionArea onClick={onCardSelected}>
        <CardContent
          sx={{
            textAlign: "center",
          }}
        >
          <Typography
            sx={{
              color: fontStyle.color,
              backgroundColor: theme.palette.getContrastText(fontStyle.color),
              fontSize: fontStyle.fontSize,
              fontWeight: fontStyle.fontWeight,
            }}
          >
            {variant}
          </Typography>
        </CardContent>
      </CardActionArea>
      <CardActions>
        <FontSizeDropdown variant={variant} fontStyle={fontStyle} />
        <FontWeightDropdown variant={variant} fontStyle={fontStyle} />
        <FontColorSelector variant={variant} fontStyle={fontStyle} />
      </CardActions>
    </Card>
  );
}
