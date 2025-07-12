import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  IconButton,
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
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

/** Shows the experience in editor page */
export function EditorExperience(): JSX.Element {
  const dispatch = useAppDispatch();
  const { experiences } = useAppSelector(cvDataSelector);
  const { dateFormat } = useAppSelector(styleSelector);
  const [newExperiences, setNewExperiences] = useState<Experience[]>([]);
  const [selectedExperienceId, setSelectedExperienceId] = useState<
    string | null
  >(null);

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

  const { updateExperience, removeExperience, swapExperiences } =
    useEditorExperience({
      setNewExperiences,
    });

  return (
    <>
      {newExperiences.map((experience, index) => (
        <Accordion
          key={experience.id}
          sx={{ marginBottom: 2, width: "100%" }}
          expanded={selectedExperienceId === experience.id}
          onChange={() =>
            setSelectedExperienceId(
              selectedExperienceId === experience.id ? null : experience.id
            )
          }
        >
          <Box
            display="flex"
            justifyContent={"space-between"}
            sx={{
              backgroundColor: "#f5f5f5",
            }}
          >
            <Box display="flex">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  swapExperiences(index, index - 1);
                }}
                disabled={index === 0}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  swapExperiences(index, index + 1);
                }}
                disabled={index === newExperiences.length - 1}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </Box>
            <AccordionSummary
              aria-controls={`panel-${experience.id}-content`}
              id={`panel-${experience.id}-header`}
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

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                pr: 1,
              }}
            >
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  updateExperience(experience.id, {
                    shouldShow: !experience.shouldShow,
                  });
                }}
              >
                {experience.shouldShow ? (
                  <VisibilityIcon />
                ) : (
                  <VisibilityOffIcon />
                )}
              </IconButton>

              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  removeExperience(experience.id);
                }}
              >
                <DeleteIcon />
              </IconButton>
              <IconButton
                onClick={() =>
                  setSelectedExperienceId(
                    selectedExperienceId === experience.id
                      ? null
                      : experience.id
                  )
                }
              >
                <ExpandMoreIcon />
              </IconButton>
            </Box>
          </Box>

          <AccordionDetails>
            <TextField
              label="Job Title"
              value={experience.jobTitle}
              onChange={(e) =>
                updateExperience(experience.id, { jobTitle: e.target.value })
              }
              sx={{ mt: 2 }}
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
        </Accordion>
      ))}
    </>
  );
}
