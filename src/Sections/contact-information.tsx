import { JSX } from "react";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";

export function ContactInformation(): JSX.Element {
  return (
    <>
      <AlternateEmailIcon /> smamirshahi@gmail.com
      <SmartphoneIcon /> +49 1577 1531 797
      <LocationOnIcon /> Koblenz, Germany
      <LinkedInIcon /> https://www.linkedin.com/in/mohammadamirshahi/
      <GitHubIcon /> https://github.com/smamirshahi
    </>
  );
}
