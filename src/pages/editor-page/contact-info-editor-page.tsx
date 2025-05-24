import { Box } from "@mui/material";
import { TextFieldWithIcon } from "../../components/text-field-with-icon";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import GitHubIcon from "@mui/icons-material/GitHub";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { SetStateFunction } from "@src/store/store-helper";
import { ContactInfo } from "@src/custom-types/json-types";

interface Props {
  /** The contact information to edit */
  contactInfo: ContactInfo;

  /** Setter for the contact information to edit */
  setContactInfo: SetStateFunction<ContactInfo>;
}

export function ContactInfoEditorPage({
  contactInfo,
  setContactInfo,
}: Props): JSX.Element {
  return (
    <>
      <Box display="flex" gap={2} mb={2}>
        <TextFieldWithIcon
          icon={<AlternateEmailIcon />}
          label="Email"
          value={contactInfo.email}
          onChange={(event) =>
            setContactInfo((prev) => ({ ...prev, email: event.target.value }))
          }
        />
        <TextFieldWithIcon
          icon={<SmartphoneIcon />}
          label="Phone"
          value={contactInfo.phone}
          onChange={(event) =>
            setContactInfo((prev) => ({ ...prev, phone: event.target.value }))
          }
        />
        <TextFieldWithIcon
          icon={<LinkedInIcon />}
          label="LinkedInId"
          value={contactInfo.linkedInId}
          onChange={(event) =>
            setContactInfo((prev) => ({
              ...prev,
              linkedId: event.target.value,
            }))
          }
        />
      </Box>
      <Box display="flex" gap={2} mb={2}>
        <TextFieldWithIcon
          icon={<GitHubIcon />}
          label="Github"
          value={contactInfo.gitHubId}
          onChange={(event) =>
            setContactInfo((prev) => ({
              ...prev,
              gitHubId: event.target.value,
            }))
          }
        />
        <TextFieldWithIcon
          icon={<LocationOnIcon />}
          label="location"
          value={contactInfo.location}
          onChange={(event) =>
            setContactInfo((prev) => ({
              ...prev,
              location: event.target.value,
            }))
          }
        />
      </Box>
    </>
  );
}
