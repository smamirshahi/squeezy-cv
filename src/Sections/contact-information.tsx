import { JSX } from "react";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import { Grid2 } from "@mui/material";
import { IconWithText } from "../common/icon-with-text";

export function ContactInformation(): JSX.Element {
  return (
    <Grid2 container direction="row">
      <IconWithText icon={AlternateEmailIcon} text="smamirshahi@gmail.com" />
      <IconWithText icon={SmartphoneIcon} text="(+49) 1577 1531 797" />
      <IconWithText icon={LocationOnIcon} text="Koblenz, Germany" />
      <IconWithText
        icon={LinkedInIcon}
        text="https://www.linkedin.com/in/mohammadamirshahi/"
      />
      {/* <IconWithText icon={GitHubIcon} text="https://github.com/smamirshahi" /> */}
    </Grid2>
  );
}
