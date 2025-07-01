import { Slider } from "@mui/material";

const marks = [
  {
    value: 30,
    label: "30%",
  },
  {
    value: 40,
    label: "40%",
  },
  {
    value: 50,
    label: "50%",
  },
  {
    value: 60,
    label: "60%",
  },
  {
    value: 70,
    label: "70%",
  },
];

export function CvSlider(): JSX.Element {
  return (
    <Slider
      aria-label="Restricted values"
      defaultValue={20}
      // getAriaValueText={valuetext}
      step={null}
      valueLabelDisplay="auto"
      marks={marks}
      min={0}
      max={100}
    />
  );
}
