import { AccordionDetails, Box, TextField } from "@mui/material";
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
import { EditorAccordionHeader } from "@pages/editor-page/accordion/editor-accordion-header";
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

  const { updateExperience, removeExperience, swapExperiences } =
    useEditorExperience({
      setNewExperiences,
    });

  return (
    <>
      {newExperiences.map((experience, index) => (
        <EditorAccordionHeader
          key={experience.id}
          accordionIndex={index}
          swapFunction={swapExperiences}
          removeFunction={removeExperience}
          updateFunction={updateExperience}
          title={`${experience.jobTitle} (
          ${dayjs(experience.startDate).format(dateFormat)} - ${
            experience.endDate
              ? dayjs(experience.endDate).format(dateFormat)
              : "Present"
          }`}
          entity={{ id: experience.id, shouldShow: experience.shouldShow }}
          isLastEntity={index === newExperiences.length - 1}
        >
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
        </EditorAccordionHeader>
      ))}
    </>
  );
}
