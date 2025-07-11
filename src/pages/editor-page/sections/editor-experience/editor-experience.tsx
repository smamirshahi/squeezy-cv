import {
  Box,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import {
  SetStateFunction,
  useAppDispatch,
  useAppSelector,
} from "@store/store-helper";
import { Experience } from "@custom-types/experience-types";
import { useEditorExperience } from "@pages/editor-page/sections/editor-experience/use-editor-experience";
import { cvDataSelector, setExperiences } from "@store/cv-data/cv-data-slice";
import { useEffect } from "react";
import { useEditorPage } from "@pages/editor-page/use-editor-page";

interface Props {
  newExperiences: Experience[];
  setNewExperiences: SetStateFunction<Experience[]>;
}

/** Shows the experience in editor page */
export function EditorExperience({
  newExperiences,
  setNewExperiences,
}: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const { experiences } = useAppSelector(cvDataSelector);

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

  const {
    updateExperience,
    updateBulletPoint,
    removeBulletPoint,
    addBulletPoint,
    removeExperience,
  } = useEditorExperience({ setNewExperiences });

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
              onChange={(e) =>
                updateExperience(experience.id, { jobTitle: e.target.value })
              }
              fullWidth
            />

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
          </Box>

          {/* Company and Location */}
          <Box sx={{ display: "flex", gap: 2 }}>
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
          <Box sx={{ display: "flex", gap: 2 }}>
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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {experience.bulletPoints.map((bp, index) => (
              <Box
                key={bp.id}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <TextField
                  label={`Bullet Point ${index + 1}`}
                  value={bp.text}
                  onChange={(e) =>
                    updateBulletPoint(experience.id, bp.id, e.target.value)
                  }
                  fullWidth
                />
                <IconButton
                  onClick={() => removeBulletPoint(experience.id, bp.id)}
                  disabled={experience.bulletPoints.length === 1}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Box>
              <IconButton onClick={() => addBulletPoint(experience.id)}>
                <AddIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
