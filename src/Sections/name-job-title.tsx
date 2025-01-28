import { Typography } from "@mui/material";
import { JSX } from "react";

export function NameJobTitle(): JSX.Element {
  return (
    <>
      <Typography sx={{ fontSize: "16pt", fontFamily: "Calibri, sans-serif" }}>
        Dr. Mohammad Amirshahi
      </Typography>
      <Typography
        sx={{ fontSize: "12pt", fontFamily: "Calibri, sans-serif" }}
        gutterBottom
      >
        Software Developer
      </Typography>
    </>
  );
}
