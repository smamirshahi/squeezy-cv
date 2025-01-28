import { EducationSection } from "../common/education-section";
import { JSX } from "react";

/** Renders the whole education part */
export function Education(): JSX.Element {
  return (
    <>
      <EducationSection
        degree="PhD, Earth Science"
        institution="MARUM - University of Bremen"
        datePeriod={{ start: "03.2014", end: "08.2019" }}
        dissertationTitle="Dissertation Topic: Turbulent Suspension of Sediments in Shallow Shelf Seas"
      />
      <EducationSection
        degree="M.Sc., Civil and Environmental Engineering"
        institution="Amirkabir University of Technology"
        datePeriod={{ start: "09.2010", end: "02.2013" }}
        dissertationTitle="Dissertation Topic: Experimental Study of Effect of Turbulence Intensity on Riprap Stability"
      />
    </>
  );
}
