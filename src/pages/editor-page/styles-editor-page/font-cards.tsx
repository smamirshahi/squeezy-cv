import { AvailableFonts } from "@custom-types/styles-types";
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
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { isValidFont } from "@custom-types/type-guards";

export function FontCards(): JSX.Element {
  const { typography } = useAppSelector(styleSelector);
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const { selectedTypography } = useAppSelector(appSelector);

  function onCardSelected(variant: AvailableFonts): void {
    selectedTypography === variant
      ? dispatch(setSelectedTypography(null))
      : dispatch(setSelectedTypography(variant));
  }

  return (
    <>
      {Object.entries(typography).map(([variant, style]) => {
        if (isValidFont(variant)) {
          return (
            <Card
              key={variant}
              sx={{ width: "280px", m: "10px", border: "1px solid black" }}
            >
              <CardActionArea onClick={() => onCardSelected(variant)}>
                <CardContent
                  sx={{
                    textAlign: "center",
                  }}
                >
                  <Typography
                    sx={{
                      color: style.color,
                      backgroundColor: theme.palette.getContrastText(
                        style.color
                      ),
                      fontSize: style.fontSize,
                      fontWeight: style.fontWeight,
                    }}
                  >
                    {variant}
                  </Typography>
                </CardContent>
              </CardActionArea>
              <CardActions>
                <FontSizeDropdown variant={variant} fontStyle={style} />
                <FontWeightDropdown variant={variant} fontStyle={style} />
                <FontColorSelector variant={variant} fontStyle={style} />
              </CardActions>
            </Card>
          );
        }
      })}
    </>
  );
}
