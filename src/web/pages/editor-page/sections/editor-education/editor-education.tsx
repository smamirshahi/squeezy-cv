import { Box, TextField } from "@mui/material";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import {
  NewItemTemplate,
  useSectionDraft,
} from "@pages/editor-page/use-section-draft";
import { HintAdornment } from "@components/description-hint";
import dayjs from "dayjs";
import { datedTitle } from "@shared/variant/item-label";
import { ItemListEditor } from "@pages/editor-page/item-list/item-list-editor";

const NEW_EDUCATION: NewItemTemplate = {
  fields: {
    degree: "",
    institute: "",
    location: "",
    startDate: "",
    endDate: "",
    dissertationTitle: "",
  },
  bullets: [],
};

interface Props {
  /** Id of the education section being edited */
  sectionId: string;
}

/** Shows the education in editor page */
export function EditorEducation({ sectionId }: Props): JSX.Element {
  const { dateFormat } = useAppSelector(styleSelector);
  const { section, updateFields, removeItem, addNewItem } = useSectionDraft(
    sectionId,
    NEW_EDUCATION
  );

  const items = section?.items ?? [];

  return (
    <ItemListEditor
      noun="education"
      rows={items.map((item) => ({
        id: item.id,
        title: datedTitle(
          item.fields.degree ?? "",
          item.fields.startDate,
          item.fields.endDate,
          (day) => dayjs(day).format(dateFormat)
        ),
      }))}
      onRemove={removeItem}
      onAdd={addNewItem}
      addLabel="Add new education"
      renderForm={(itemId) => {
        const item = items.find((entry) => entry.id === itemId);
        if (!item) {
          return <></>;
        }
        return (
          <>
            <TextField
              label="Degree"
              value={item.fields.degree ?? ""}
              onChange={(e) =>
                updateFields(item.id, { degree: e.target.value })
              }
              sx={{ mt: 2 }}
              fullWidth
            />

            {/* Institute and Location */}
            <Box sx={{ display: "flex", gap: 2, my: 2 }}>
              <TextField
                label="Institute"
                value={item.fields.institute ?? ""}
                onChange={(e) =>
                  updateFields(item.id, { institute: e.target.value })
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
                label="Start Date"
                value={item.fields.startDate ?? ""}
                onChange={(e) =>
                  updateFields(item.id, { startDate: e.target.value })
                }
                fullWidth
              />
              <TextField
                label="End Date"
                value={item.fields.endDate ?? ""}
                onChange={(e) =>
                  updateFields(item.id, { endDate: e.target.value })
                }
                fullWidth
              />
            </Box>

            <TextField
              label="Dissertation Title"
              value={item.fields.dissertationTitle ?? ""}
              onChange={(e) =>
                updateFields(item.id, { dissertationTitle: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Description"
              value={item.fields.description ?? ""}
              onChange={(e) =>
                updateFields(item.id, { description: e.target.value })
              }
              multiline
              minRows={3}
              slotProps={{ input: { endAdornment: <HintAdornment /> } }}
              sx={{ mt: 2 }}
              fullWidth
            />
          </>
        );
      }}
    />
  );
}
