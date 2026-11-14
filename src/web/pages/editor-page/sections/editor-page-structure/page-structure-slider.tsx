import { Slider, Stack, Typography } from "@components/ui";
import { appSelector, setColumnWidth } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

const selectablePercents = [
  {
    value: 30,
  },
  {
    value: 40,
  },
  {
    value: 50,
  },
  {
    value: 60,
  },
  {
    value: 70,
  },
];

export function PageStructureSlider(): JSX.Element {
  const { columnWidth } = useAppSelector(appSelector);
  const dispatch = useAppDispatch();

  return (
    <Stack
      spacing={2}
      direction="row"
      sx={{ alignItems: "center", maxWidth: 420 }}
    >
      <Typography>{columnWidth.left}%</Typography>
      <Slider
        value={columnWidth.left}
        onChange={(_, value) =>
          dispatch(setColumnWidth({ left: value, right: 100 - value }))
        }
        step={null}
        valueLabelDisplay="auto"
        marks={selectablePercents}
        min={0}
        max={100}
      />
      <Typography>{columnWidth.right}%</Typography>
    </Stack>
  );
}
