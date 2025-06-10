import { Box, Button, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { CVAccordion } from "@components/cv-accordion";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addBulletPoint,
  addExperience,
  cvDataSelector,
  removeBulletPoint,
  removeExperience,
} from "@store/cv-data/cv-data-slice";
import {
  UpdateBulletPointSection,
  UpdateExperienceSection,
} from "@pages/editor-page/experience-editor/experience-section";

export function ExperienceEditorPage(): JSX.Element {
  const { experiences } = useAppSelector(cvDataSelector);
  const dispatch = useAppDispatch();

  return (
    <CVAccordion title="Work Experience">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {experiences.map((experience) => (
          <Box
            key={experience.id}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              <UpdateExperienceSection
                label="Job Title"
                field="jobTitle"
                experience={experience}
              />
              <IconButton
                onClick={() => dispatch(removeExperience(experience.id))}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
            {/* Company and Location in one line */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <UpdateExperienceSection
                label="Company"
                field="company"
                experience={experience}
              />
              <UpdateExperienceSection
                label="Location"
                field="location"
                experience={experience}
              />
            </Box>
            {/* Start and End Date in one line */}
            <Box sx={{ display: "flex", gap: 2 }}>
              <UpdateExperienceSection
                label="Start Date"
                field="startDate"
                experience={experience}
                textFieldType="date"
              />
              <UpdateExperienceSection
                label="End Date"
                field="endDate"
                experience={experience}
                textFieldType="date"
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                mb: 2,
              }}
            >
              {experience.bulletPoints.map((bulletPoint, index) => (
                <Box
                  key={bulletPoint.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <UpdateBulletPointSection
                    experience={experience}
                    bulletPoint={bulletPoint}
                    bulletPointIndex={index}
                  />
                  <IconButton
                    onClick={() =>
                      dispatch(
                        removeBulletPoint({
                          experienceId: experience.id,
                          bulletPointId: bulletPoint.id,
                        })
                      )
                    }
                    disabled={experience.bulletPoints.length === 1}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Box>
                <IconButton
                  onClick={() =>
                    dispatch(addBulletPoint({ experienceId: experience.id }))
                  }
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Box>
          </Box>
        ))}

        <Button variant="contained" onClick={() => dispatch(addExperience())}>
          Add Work Experience
        </Button>
      </Box>
    </CVAccordion>
  );
}
