import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Box,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { Experience } from "@custom-types/experience-types";
import { useEditorExperience } from "@pages/editor-page/sections/editor-experience/use-editor-experience";
import {
  cvDataSelector,
  setExperiences,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { useEffect, useState } from "react";
import { useEditorPage } from "@pages/editor-page/use-editor-page";
import { EditorExperienceBp } from "@pages/editor-page/sections/editor-experience/editor-experience-bp";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import dayjs from "dayjs";

/** Shows the experience in editor page */
export function EditorExperience(): JSX.Element {
  const dispatch = useAppDispatch();
  const { experiences } = useAppSelector(cvDataSelector);
  const { dateFormat } = useAppSelector(styleSelector);
  const [newExperiences, setNewExperiences] = useState<Experience[]>([]);

  useEffect(() => {
    setNewExperiences(experiences);
  }, [experiences, setNewExperiences]);

  useEditorPage({
    onApplyChanges: () => {
      dispatch(setExperiences(newExperiences));
    },
    onDiscardChanges: () => {
      setNewExperiences(experiences);
    },
  });

  const { updateExperience, removeExperience } = useEditorExperience({
    setNewExperiences,
  });

  return (
    <>
      {newExperiences.map((experience) => (
        <Accordion key={experience.id} sx={{ marginBottom: 2 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="panel3-content"
            id="panel3-header"
            sx={{ backgroundColor: "#f5f5f5" }}
          >
            <Typography component="span">
              {experience.jobTitle} (
              {`${dayjs(experience.startDate).format(dateFormat)} - ${
                experience.endDate
                  ? dayjs(experience.endDate).format(dateFormat)
                  : "Present"
              }`}
              )
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              label="Job Title"
              value={experience.jobTitle}
              onChange={(e) =>
                updateExperience(experience.id, { jobTitle: e.target.value })
              }
              fullWidth
            />

            {/* Company and Location */}
            <Box sx={{ display: "flex", gap: 2, my: 2 }}>
              <TextField
                label="Company"
                value={experience.company}
                onChange={(e) =>
                  updateExperience(experience.id, { company: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="Location"
                value={experience.location}
                onChange={(e) =>
                  updateExperience(experience.id, { location: e.target.value })
                }
                fullWidth
              />
            </Box>

            {/* Dates */}
            <Box sx={{ display: "flex", gap: 2, my: 2 }}>
              <TextField
                type="date"
                value={experience.startDate}
                onChange={(e) =>
                  updateExperience(experience.id, { startDate: e.target.value })
                }
                fullWidth
              />
              <TextField
                type="date"
                value={experience.endDate}
                onChange={(e) =>
                  updateExperience(experience.id, { endDate: e.target.value })
                }
                fullWidth
              />
            </Box>

            {/* Bullet Points */}
            <EditorExperienceBp
              experienceId={experience.id}
              bulletPoints={experience.bulletPoints}
              updateExperience={updateExperience}
            />
          </AccordionDetails>
          <AccordionActions sx={{ px: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={experience.shouldShow}
                  onChange={(e) =>
                    updateExperience(experience.id, {
                      shouldShow: e.target.checked,
                    })
                  }
                />
              }
              label="Show this experience"
            />

            <IconButton onClick={() => removeExperience(experience.id)}>
              <DeleteIcon />
            </IconButton>
          </AccordionActions>

          {/* <Divider /> */}
        </Accordion>
      ))}
    </>
  );
}
