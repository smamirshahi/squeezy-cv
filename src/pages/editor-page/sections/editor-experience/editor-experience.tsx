import {
  Box,
  Divider,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { Experience } from "@custom-types/experience-types";
import { useEditorExperience } from "@pages/editor-page/sections/editor-experience/use-editor-experience";
import { cvDataSelector, setExperiences } from "@store/cv-data/cv-data-slice";
import { useEffect, useState } from "react";
import { useEditorPage } from "@pages/editor-page/use-editor-page";
import { EditorExperienceBp } from "@pages/editor-page/sections/editor-experience/editor-experience-bp";

/** Shows the experience in editor page */
export function EditorExperience(): JSX.Element {
  const dispatch = useAppDispatch();
  const { experiences } = useAppSelector(cvDataSelector);
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
          <EditorExperienceBp
            experienceId={experience.id}
            bulletPoints={experience.bulletPoints}
            updateExperience={updateExperience}
          />

          <Divider />
        </Box>
      ))}
    </Box>
  );
}
