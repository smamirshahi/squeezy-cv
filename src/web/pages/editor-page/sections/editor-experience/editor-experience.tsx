import { Box, TextField } from "@mui/material";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import {
  NewItemTemplate,
  useSectionDraft,
} from "@pages/editor-page/use-section-draft";
import { ItemListEditor } from "@pages/editor-page/item-list/item-list-editor";
import { HintAdornment } from "@components/description-hint";
import dayjs from "dayjs";
import { datedTitle } from "@shared/variant/item-label";

const NEW_EXPERIENCE: NewItemTemplate = {
  fields: {
    jobTitle: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
  },
  bullets: [],
};

interface Props {
  /** Id of the experience section being edited */
  sectionId: string;
}

/** Shows the experience in editor page */
export function EditorExperience({ sectionId }: Props): JSX.Element {
  const { dateFormat } = useAppSelector(styleSelector);
  const { section, updateFields, removeItem, addNewItem } = useSectionDraft(
    sectionId,
    NEW_EXPERIENCE
  );

  const items = section?.items ?? [];

  return (
    <ItemListEditor
      noun="experience"
      rows={items.map((item) => ({
        id: item.id,
        title: datedTitle(
          item.fields.jobTitle ?? "",
          item.fields.startDate,
          item.fields.endDate,
          (day) => dayjs(day).format(dateFormat)
        ),
      }))}
      onRemove={removeItem}
      onAdd={addNewItem}
      addLabel="Add new experience"
      renderForm={(itemId) => {
        const item = items.find((entry) => entry.id === itemId);
        if (!item) {
          return <></>;
        }
        return (
          <>
            <TextField
              label="Job Title"
              value={item.fields.jobTitle ?? ""}
              onChange={(e) =>
                updateFields(item.id, { jobTitle: e.target.value })
              }
              sx={{ mt: 2 }}
              fullWidth
            />

            {/* Company and Location */}
            <Box sx={{ display: "flex", gap: 2, my: 2 }}>
              <TextField
                label="Company"
                value={item.fields.company ?? ""}
                onChange={(e) =>
                  updateFields(item.id, { company: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="Location"
                value={item.fields.location ?? ""}
                onChange={(e) =>
                  updateFields(item.id, { location: e.target.value })
                }
                fullWidth
              />
            </Box>

            {/* Dates */}
            <Box sx={{ display: "flex", gap: 2, my: 2 }}>
              <TextField
                type="date"
                value={item.fields.startDate ?? ""}
                onChange={(e) =>
                  updateFields(item.id, { startDate: e.target.value })
                }
                fullWidth
              />
              <TextField
                type="date"
                value={item.fields.endDate ?? ""}
                onChange={(e) =>
                  updateFields(item.id, { endDate: e.target.value })
                }
                fullWidth
              />
            </Box>

            <TextField
              label="Description"
              value={item.fields.description ?? ""}
              onChange={(e) =>
                updateFields(item.id, { description: e.target.value })
              }
              multiline
              minRows={3}
              slotProps={{ input: { endAdornment: <HintAdornment /> } }}
              fullWidth
            />
          </>
        );
      }}
    />
  );
}
