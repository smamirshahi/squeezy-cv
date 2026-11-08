import { HintAdornment } from "@components/description-hint";
import { AccordionDetails, Box, TextField } from "@mui/material";
import {
  NewItemTemplate,
  useSectionDraft,
} from "@pages/editor-page/use-section-draft";
import { EditorAccordionHeader } from "@pages/editor-page/accordion/editor-accordion-header";

const NEW_ITEM: NewItemTemplate = {
  fields: {
    title: "",
    subtitle: "",
    location: "",
    startDate: "",
    endDate: "",
    description: "",
  },
  bullets: [],
};

interface Props {
  /** Id of the section being edited (projects, certifications, publications, volunteering or custom) */
  sectionId: string;
}

/** Editor for sections without a special layout: a title, a subtitle, dates, a description and bullets */
export function EditorGenericSection({ sectionId }: Props): JSX.Element {
  const {
    section,
    updateFields,
    removeItem,
    moveItem,
    setVisibility,
    isVisible,
  } = useSectionDraft(sectionId, NEW_ITEM);

  const items = section?.items ?? [];

  return (
    <>
      {items.map((item, index) => (
        <EditorAccordionHeader
          key={item.id}
          accordionIndex={index}
          swapFunction={moveItem}
          removeFunction={removeItem}
          onVisibilityChange={setVisibility}
          title={item.fields.title || "(untitled)"}
          entity={{ id: item.id, shouldShow: isVisible(item.id) }}
          isLastEntity={index === items.length - 1}
        >
          <AccordionDetails>
            <TextField
              label="Title"
              value={item.fields.title ?? ""}
              onChange={(e) => updateFields(item.id, { title: e.target.value })}
              sx={{ mt: 2 }}
              fullWidth
            />
            <Box sx={{ display: "flex", gap: 2, my: 2 }}>
              <TextField
                label="Subtitle"
                value={item.fields.subtitle ?? ""}
                onChange={(e) =>
                  updateFields(item.id, { subtitle: e.target.value })
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
            <Box sx={{ display: "flex", gap: 2, my: 2 }}>
              <TextField
                type="date"
                label="Start date"
                value={item.fields.startDate ?? ""}
                onChange={(e) =>
                  updateFields(item.id, { startDate: e.target.value })
                }
                // eslint-disable-next-line @typescript-eslint/naming-convention -- `shrink` is the MUI prop name
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                type="date"
                label="End date"
                value={item.fields.endDate ?? ""}
                onChange={(e) =>
                  updateFields(item.id, { endDate: e.target.value })
                }
                // eslint-disable-next-line @typescript-eslint/naming-convention -- `shrink` is the MUI prop name
                slotProps={{ inputLabel: { shrink: true } }}
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
              slotProps={{ input: { endAdornment: <HintAdornment /> } }}
              sx={{ mb: 2 }}
              fullWidth
            />
          </AccordionDetails>
        </EditorAccordionHeader>
      ))}
    </>
  );
}
