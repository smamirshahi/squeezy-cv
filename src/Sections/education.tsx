import { Box } from "@mui/material";
import { EducationSection } from "../common/education-section";
import { JSX } from "react";

export function Education(): JSX.Element {
  return (
    <Box>
      <EducationSection
        degree="PhD, Earth Science"
        institution="MARUM - University of Bremen"
        datePeriod="03.2014 - 08.2019"
        dissertationTitle="Dissertation Topic: Turbulent Suspension of Sediments in Shallow Shelf Seas"
      />
      <EducationSection
        degree="M.Sc., Civil and Environmental Engineering"
        institution="Amirkabir University of Technology"
        datePeriod="09.2010 - 02.2013"
        dissertationTitle="Dissertation Topic: Experimental Study of Effect of Turbulence Intensity on Riprap Stability"
      />
    </Box>
  );
}
