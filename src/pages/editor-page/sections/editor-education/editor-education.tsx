import { AccordionDetails, Box, TextField } from "@mui/material";
import { Education } from "@custom-types/education-types";
import { useEditorEducation } from "@pages/editor-page/sections/editor-education/use-editor-education";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  cvDataSelector,
  setEducations,
  styleSelector,
} from "@store/cv-data/cv-data-slice";
import { useEffect, useState } from "react";
import { useEditorPage } from "@pages/editor-page/use-editor-page";
import dayjs from "dayjs";
import { EditorAccordionHeader } from "@pages/editor-page/accordion/editor-accordion-header";

/** Shows the education in editor page */
export function EditorEducation(): JSX.Element {
  const dispatch = useAppDispatch();
  const { educations } = useAppSelector(cvDataSelector);
  const { dateFormat } = useAppSelector(styleSelector);
  const [newEducations, setNewEducations] = useState<Education[]>([]);

  useEffect(() => {
    setNewEducations(educations);
  }, [educations, setNewEducations]);

  useEditorPage({
    onApplyChanges: () => {
      dispatch(setEducations(newEducations));
    },
    onDiscardChanges: () => {
      setNewEducations(educations);
    },
  });

  const { updateEducation, removeEducation, swapEducations } =
    useEditorEducation({
      setNewEducations,
    });

  return (
    <>
      {newEducations.map((education, index) => (
        <EditorAccordionHeader
          key={education.id}
          accordionIndex={index}
          swapFunction={swapEducations}
          removeFunction={removeEducation}
          updateFunction={updateEducation}
          title={`${education.degree} (
                  ${dayjs(education.startDate).format(dateFormat)} - ${
                    education.endDate
                      ? dayjs(education.endDate).format(dateFormat)
                      : "Present"
                  }`}
          entity={{ id: education.id, shouldShow: education.shouldShow }}
          isLastEntity={index === newEducations.length - 1}
        >
          <AccordionDetails>
            <TextField
              label="Degree"
              value={education.degree}
              onChange={(e) =>
                updateEducation(education.id, { degree: e.target.value })
              }
              sx={{ mt: 2 }}
              fullWidth
            />

            {/* Institute and Location */}
            <Box sx={{ display: "flex", gap: 2, my: 2 }}>
              <TextField
                label="Institute"
                value={education.institute}
                onChange={(e) =>
                  updateEducation(education.id, { institute: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="Location"
                value={education.location}
                onChange={(e) =>
                  updateEducation(education.id, { location: e.target.value })
                }
                fullWidth
              />
            </Box>

            {/* Dates */}
            <Box sx={{ display: "flex", gap: 2, my: 2 }}>
              <TextField
                label="Start Date"
                value={education.startDate}
                onChange={(e) =>
                  updateEducation(education.id, { startDate: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="End Date"
                value={education.endDate}
                onChange={(e) =>
                  updateEducation(education.id, { endDate: e.target.value })
                }
                fullWidth
              />
            </Box>

            <TextField
              label="Dissertation Title"
              value={education.dissertationTitle}
              onChange={(e) =>
                updateEducation(education.id, {
                  dissertationTitle: e.target.value,
                })
              }
              fullWidth
            />
          </AccordionDetails>
        </EditorAccordionHeader>
      ))}
    </>
  );
}
