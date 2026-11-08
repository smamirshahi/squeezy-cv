import { AccordionDetails, Box, Button, TextField } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useAppSelector } from "@store/store-helper";
import { styleSelector } from "@store/cv-data/cv-data-slice";
import { setItemBullets } from "@store/vault/vault-slice";
import {
  NewItemTemplate,
  useSectionDraft,
} from "@pages/editor-page/use-section-draft";
import { EditorExperienceBp } from "@pages/editor-page/sections/editor-experience/editor-experience-bp";
import { ItemExtras } from "@pages/editor-page/item-metadata/item-extras";
import { EditorAccordionHeader } from "@pages/editor-page/accordion/editor-accordion-header";
import dayjs from "dayjs";

const NEW_EXPERIENCE: NewItemTemplate = {
  fields: {
    jobTitle: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
  },
  bullets: [{ text: "" }],
};

interface Props {
  /** Id of the experience section being edited */
  sectionId: string;
}

/** Shows the experience in editor page */
export function EditorExperience({ sectionId }: Props): JSX.Element {
  const { dateFormat } = useAppSelector(styleSelector);
  const {
    section,
    updateFields,
    removeItem,
    moveItem,
    draftDispatch,
    addNewItem,
  } = useSectionDraft(sectionId, NEW_EXPERIENCE);

  const items = section?.items ?? [];

  return (
    <>
      {items.map((item, index) => (
        <EditorAccordionHeader
          key={item.id}
          accordionIndex={index}
          swapFunction={moveItem}
          removeFunction={removeItem}
          title={`${item.fields.jobTitle ?? ""} (
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

            {/* Bullet Points */}
            <EditorExperienceBp
              bullets={item.bullets}
              onChange={(bullets) =>
                draftDispatch(
                  setItemBullets({ sectionId, itemId: item.id, bullets })
                )
              }
            />
            <ItemExtras
              sectionId={sectionId}
              item={item}
              draftDispatch={draftDispatch}
              shouldEditBullets
            />
          </AccordionDetails>
        </EditorAccordionHeader>
      ))}
      <Button startIcon={<AddIcon />} onClick={addNewItem}>
        Add new experience
      </Button>
    </>
  );
}
