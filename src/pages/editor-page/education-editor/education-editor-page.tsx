import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Switch,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addEducation,
  cvDataSelector,
  removeEducation,
  updateEducation,
} from "@store/cv-data/cv-data-slice";
import { UpdateEducationSection } from "@pages/editor-page/education-editor/education-section";

/** Shows the education in editor page */
export function EducationEditorPage(): JSX.Element {
  const { educations } = useAppSelector(cvDataSelector);
  const dispatch = useAppDispatch();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {educations.map((education) => (
        <Box
          key={education.id}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <UpdateEducationSection
              label="Degree"
              field="degree"
              education={education}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={education.shouldShow}
                  onChange={(event) =>
                    dispatch(
                      updateEducation({
                        educationId: education.id,
                        key: "shouldShow",
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        value: event.target.checked,
                      })
                    )
                  }
                />
              }
              label="Show this education"
            />

            <IconButton onClick={() => dispatch(removeEducation(education.id))}>
              <DeleteIcon />
            </IconButton>
          </Box>

          {/* Company and Location in one line */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <UpdateEducationSection
              label="Institute"
              field="institute"
              education={education}
            />
            <UpdateEducationSection
              label="Location"
              field="location"
              education={education}
            />
          </Box>

          {/* Start and End Date in one line */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <UpdateEducationSection
              label="Start Date"
              field="startDate"
              education={education}
              textFieldType="date"
            />
            <UpdateEducationSection
              label="End Date"
              field="endDate"
              education={education}
              textFieldType="date"
            />
          </Box>
          <UpdateEducationSection
            label="Dissertation Title"
            field="dissertationTitle"
            education={education}
          />
        </Box>
      ))}

      <Button variant="contained" onClick={() => dispatch(addEducation())}>
        Add Education
      </Button>
    </Box>
  );
}
