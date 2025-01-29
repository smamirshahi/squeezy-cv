import { List, ListItem, Typography } from "@mui/material";
import { JSX } from "react";

export function WorkExperienceSubsection(): JSX.Element {
  return (
    <>
      <Typography
        sx={{
          fontSize: "12pt",
          fontFamily: "Calibri, sans-serif",
          fontWeight: "bold",
        }}
      >
        Researcher
      </Typography>
      <p>MARUM-University of Bremen</p>
      <p>2019 - Present</p>
      <List sx={{ listStyleType: "disc" }}>
        <ListItem sx={{ display: "list-item" }}>as</ListItem>
      </List>
    </>
  );
}
