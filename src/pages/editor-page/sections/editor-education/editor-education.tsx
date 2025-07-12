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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import dayjs from "dayjs";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

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
        <Accordion key={education.id} sx={{ marginBottom: 2 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls={`panel-${education.id}-content`}
            id={`panel-${education.id}-header`}
            sx={{ backgroundColor: "#f5f5f5" }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                pr: 1,
              }}
            >
              <Typography component="span">
                {education.degree} (
                {`${dayjs(education.startDate).format(dateFormat)} - ${
                  education.endDate
                    ? dayjs(education.endDate).format(dateFormat)
                    : "Present"
                }`}
                )
              </Typography>
              <Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    swapEducations(index, index - 1);
                  }}
                  disabled={index === 0}
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    swapEducations(index, index + 1);
                  }}
                  disabled={index === newEducations.length - 1}
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </AccordionSummary>
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
          <AccordionActions sx={{ px: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={education.shouldShow}
                  onChange={(e) =>
                    updateEducation(education.id, {
                      shouldShow: e.target.checked,
                    })
                  }
                />
              }
              label="Show this education"
            />

            <IconButton onClick={() => removeEducation(education.id)}>
              <DeleteIcon />
            </IconButton>
          </AccordionActions>
        </Accordion>
      ))}
    </>
  );
}
