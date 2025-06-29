import { AvailableFonts } from "@custom-types/styles-types";
import {
  Box,
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

function selectedCardStyle(isSelected: boolean): React.CSSProperties {
  return {
    boxShadow: isSelected ? "0 8px 20px rgba(0,0,0,0.2)" : undefined,
    transform: isSelected ? "translateY(-4px) scale(1.02)" : undefined,
  };
}

export function FontCards(): JSX.Element {
  const { typography } = useAppSelector(styleSelector);
  const { selectedTypography } = useAppSelector(appSelector);
  const dispatch = useAppDispatch();
  const theme = useTheme();

  function onCardSelected(variant: AvailableFonts): void {
    selectedTypography === variant
      ? dispatch(setSelectedTypography(null))
      : dispatch(setSelectedTypography(variant));
  }

  return (
    <Box component="div" sx={{ display: "flex", flexWrap: "wrap" }}>
      {Object.entries(typography).map(([variant, style]) => {
        if (isValidFont(variant)) {
          return (
            <Card
              key={variant}
              sx={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                width: "280px",
                m: "10px",
                border: "1px solid black",
                ...selectedCardStyle(selectedTypography === variant),
              }}
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
    </Box>
  );
}
