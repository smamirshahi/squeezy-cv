import { Box, List, ListItem } from "@mui/material";
import { JSX } from "react";

/**
 * Work experience section
 * "Work Experience" | "Employment History" | "Experience"
 */
export function WorkExperience(): JSX.Element {
  return (
    <Box>
      <p>Researcher</p>
      <p>MARUM-University of Bremen</p>
      <p>2019 - Present</p>
      <List sx={{ listStyleType: "disc" }}>
        <ListItem sx={{ display: "list-item" }}>as</ListItem>
      </List>
    </Box>
  );
}
