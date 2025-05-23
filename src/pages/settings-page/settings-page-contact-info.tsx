import { Box } from "@mui/material";
import { TextFieldWithIcon } from "../../components/text-field-with-icon";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import {
  cvDataSelector,
  updateContactInfo,
} from "@src/store/applicant/applicant-slice";
import { useAppDispatch, useAppSelector } from "@src/store/store-helper";

export function SettingsPageContactInfo(): JSX.Element {
  const { contactInfo } = useAppSelector(cvDataSelector);
  const dispatch = useAppDispatch();

  return (
    <>
      <Box display="flex" gap={2} mb={2}>
        <TextFieldWithIcon
          icon={<AlternateEmailIcon />}
          label="Email"
          value={contactInfo.email}
          onChange={(event) =>
            dispatch(
              updateContactInfo({
                field: "email",
                value: event.target.value,
              })
            )
          }
        />
        <TextFieldWithIcon
          icon={<SmartphoneIcon />}
          label="Phone"
          value={contactInfo.phone}
          onChange={(event) =>
            dispatch(
              updateContactInfo({
                field: "phone",
                value: event.target.value,
              })
            )
          }
        />
        <TextFieldWithIcon
          icon={<LinkedInIcon />}
          label="LinkedInId"
          value={contactInfo.linkedInId}
          onChange={(event) =>
            dispatch(
              updateContactInfo({
                field: "linkedInId",
                value: event.target.value,
              })
            )
          }
        />
      </Box>
      <Box display="flex" gap={2} mb={2}>
        <TextFieldWithIcon
          icon={<GitHubIcon />}
          label="Github"
          value={contactInfo.gitHubId}
          onChange={(event) =>
            dispatch(
              updateContactInfo({
                field: "gitHubId",
                value: event.target.value,
              })
            )
          }
        />
        <TextFieldWithIcon
          icon={<LocationOnIcon />}
          label="location"
          value={contactInfo.location}
          onChange={(event) =>
            dispatch(
              updateContactInfo({
                field: "location",
                value: event.target.value,
              })
            )
          }
        />
      </Box>
    </>
  );
}
