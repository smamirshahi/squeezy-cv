import { AccordionDetails, Box, Button, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import {
  NewItemTemplate,
  useSectionDraft,
} from "@pages/editor-page/use-section-draft";
import { HintAdornment } from "@components/description-hint";
import dayjs from "dayjs";
import { EditorAccordionHeader } from "@pages/editor-page/accordion/editor-accordion-header";

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
    <>
      {items.map((item, index) => (
        <EditorAccordionHeader
          key={item.id}
          accordionIndex={index}
          removeFunction={removeItem}
          title={`${item.fields.degree ?? ""} (
                  ${dayjs(item.fields.startDate).format(dateFormat)} - ${
                    item.fields.endDate
                      ? dayjs(item.fields.endDate).format(dateFormat)
                      : "Present"
                  }`}
          entity={{ id: item.id, shouldShow: true }}
          isLastEntity={index === items.length - 1}
        >
          <AccordionDetails>
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
          </AccordionDetails>
        </EditorAccordionHeader>
      ))}
      <Button startIcon={<AddIcon />} onClick={addNewItem}>
        Add new education
      </Button>
    </>
  );
}
