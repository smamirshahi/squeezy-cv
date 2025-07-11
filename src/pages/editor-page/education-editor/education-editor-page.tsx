import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { Education } from "@custom-types/education-types";
import { useEducationEditorPage } from "@pages/editor-page/education-editor/education-editor-page-utils";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { cvDataSelector, setEducations } from "@store/cv-data/cv-data-slice";
import { useEffect, useState } from "react";
import { useEditorPage } from "@pages/editor-page/use-editor-page";

/** Shows the education in editor page */
export function EducationEditorPage(): JSX.Element {
  const dispatch = useAppDispatch();
  const { educations } = useAppSelector(cvDataSelector);
  const [newEducations, setNewEducations] = useState<Education[]>(educations);

  useEffect(() => {
    setNewEducations(educations);
  }, [educations]);

  useEditorPage({
    onApplyChanges: () => {
      dispatch(setEducations(newEducations));
    },
    onDiscardChanges: () => {
      setNewEducations(educations);
    },
  });

  const { updateEducation, removeEducation, addEducation } =
    useEducationEditorPage({
      setNewEducations,
    });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {newEducations.map((education) => (
        <Box
          key={education.id}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Degree"
              value={education.degree}
              onChange={(e) =>
                updateEducation(education.id, { degree: e.target.value })
              }
              fullWidth
            />

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
          </Box>

          {/* Institute and Location */}
          <Box sx={{ display: "flex", gap: 2 }}>
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
          <Box sx={{ display: "flex", gap: 2 }}>
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
        </Box>
      ))}

      <Button variant="contained" onClick={addEducation}>
        Add Education
      </Button>
    </Box>
  );
}
