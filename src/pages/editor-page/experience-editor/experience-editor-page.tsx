import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { SetStateFunction, useAppDispatch } from "@store/store-helper";
import {
  addBulletPoint,
  addExperience,
  removeBulletPoint,
  removeExperience,
  updateExperience,
} from "@store/cv-data/cv-data-slice";
import { Experience } from "@custom-types/experience-types";

interface Props {
  newExperiences: Experience[];
  setNewExperiences: SetStateFunction<Experience[]>;
}

/** Shows the experience in editor page */
export function ExperienceEditorPage({
  newExperiences,
  setNewExperiences,
}: Props): JSX.Element {
  const dispatch = useAppDispatch();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {newExperiences.map((experience) => (
        <Box
          key={experience.id}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Job Title"
              value={experience.jobTitle}
              onChange={(event) =>
                setNewExperiences((prev) =>
                  prev.map((exp) =>
                    exp.id === experience.id
                      ? { ...exp, jobTitle: event.target.value }
                      : exp
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={experience.shouldShow}
                  onChange={(event) =>
                    dispatch(
                      updateExperience({
                        experienceId: experience.id,
                        key: "shouldShow",
                        // eslint-disable-next-line @typescript-eslint/naming-convention
                        value: event.target.checked,
                      })
                    )
                  }
                />
              }
              label="Show this experience"
            />

            <IconButton
              onClick={() => dispatch(removeExperience(experience.id))}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
          {/* Company and Location in one line */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Company"
              value={experience.company}
              onChange={(event) =>
                setNewExperiences((prev) =>
                  prev.map((exp) =>
                    exp.id === experience.id
                      ? { ...exp, company: event.target.value }
                      : exp
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Location"
              value={experience.location}
              onChange={(event) =>
                setNewExperiences((prev) =>
                  prev.map((exp) =>
                    exp.id === experience.id
                      ? { ...exp, location: event.target.value }
                      : exp
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Start and End Date in one line */}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              type="date"
              label="Start Date"
              value={experience.startDate}
              onChange={(event) =>
                setNewExperiences((prev) =>
                  prev.map((exp) =>
                    exp.id === experience.id
                      ? { ...exp, startDate: event.target.value }
                      : exp
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="date"
              label="End Date"
              value={experience.endDate}
              onChange={(event) =>
                setNewExperiences((prev) =>
                  prev.map((exp) =>
                    exp.id === experience.id
                      ? { ...exp, endDate: event.target.value }
                      : exp
                  )
                )
              }
              fullWidth
              // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
              InputLabelProps={{ shrink: true }}
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
                <TextField
                  label={`Bullet Point ${index + 1}`}
                  value={bulletPoint.text}
                  onChange={(event) =>
                    setNewExperiences((prev) =>
                      prev.map((exp) =>
                        exp.id === experience.id
                          ? {
                              ...exp,
                              bulletPoints: exp.bulletPoints.map((bp, i) =>
                                i === index
                                  ? { ...bp, text: event.target.value }
                                  : bp
                              ),
                            }
                          : exp
                      )
                    )
                  }
                  fullWidth
                  // eslint-disable-next-line @typescript-eslint/naming-convention -- external package naming
                  InputLabelProps={{ shrink: true }}
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
  );
}
