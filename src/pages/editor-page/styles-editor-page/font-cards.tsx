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
import { FontColorSelector } from "@pages/editor-page/font-editor/font-color-selector";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { isValidFont } from "@custom-types/type-guards";
import { TypographyDropdown } from "@pages/editor-page/font-editor/typography-dropdown";

export function FontCards(): JSX.Element {
  const { typography } = useAppSelector(styleSelector);
  const { selectedTypography } = useAppSelector(appSelector);
  const dispatch = useAppDispatch();
  const theme = useTheme();

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
                backgroundColor:
                  selectedTypography === variant ? "#e7e7e7" : undefined,
              }}
            >
              <CardActionArea
                onClick={() => {
                  selectedTypography === variant
                    ? dispatch(setSelectedTypography(null))
                    : dispatch(setSelectedTypography(variant));
                }}
                disableRipple
              >
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
                {/* <FontSizeDropdown variant={variant} fontStyle={style} />
                <FontWeightDropdown variant={variant} fontStyle={style} /> */}
                <TypographyDropdown variant={variant} fontStyle={style} />
                <FontColorSelector variant={variant} fontStyle={style} />
              </CardActions>
            </Card>
          );
        }
      })}
    </Box>
  );
}
