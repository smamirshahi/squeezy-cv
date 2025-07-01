import { Slider, Stack } from "@mui/material";
import { useState } from "react";

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
  const [leftColumnSize, setLeftColumnSize] = useState<number>(
    selectablePercents[0].value
  );

  return (
    <Stack
      spacing={2}
      direction="row"
      sx={{ alignItems: "center", my: "20px" }}
    >
      <p>{leftColumnSize}%</p>
      <Slider
        value={leftColumnSize}
        onChange={(_, value) => setLeftColumnSize(value)}
        step={null}
        valueLabelDisplay="auto"
        marks={selectablePercents}
        min={0}
        max={100}
      />
      <p>{100 - leftColumnSize}%</p>
    </Stack>
  );
}
