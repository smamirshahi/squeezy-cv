import {
  Accordion,
  AccordionSummary,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { PropsWithChildren, useState } from "react";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";

interface Props {
  accordionIndex: number;
  swapFunction: (index1: number, index2: number) => void;
  removeFunction: (id: string) => void;
  onVisibilityChange: (id: string, shouldShow: boolean) => void;
  title: string;
  entity: { id: string; shouldShow: boolean };
  isLastEntity: boolean;
}

export function EditorAccordionHeader({
  accordionIndex,
  swapFunction,
  title,
  removeFunction,
  entity,
  onVisibilityChange,
  children,
  isLastEntity,
}: PropsWithChildren<Props>): JSX.Element {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  return (
    <Accordion
      key={entity.id}
      sx={{ marginBottom: 2, width: "100%" }}
      expanded={selectedEntityId === entity.id}
      onChange={() =>
        setSelectedEntityId(selectedEntityId === entity.id ? null : entity.id)
      }
    >
      <Box
        display="flex"
        justifyContent={"space-between"}
        sx={{
          backgroundColor: "#f5f5f5",
        }}
      >
        <SortingIcons
          index={accordionIndex}
          swapFunction={swapFunction}
          isLastEntity={isLastEntity}
        />
        <AccordionSummary
          aria-controls={`panel-${entity.id}-content`}
          id={`panel-${entity.id}-header`}
        >
          <Typography component="span">{title}</Typography>
        </AccordionSummary>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            pr: 1,
          }}
        >
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onVisibilityChange(entity.id, !entity.shouldShow);
            }}
          >
            {entity.shouldShow ? <VisibilityIcon /> : <VisibilityOffIcon />}
          </IconButton>

          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              removeFunction(entity.id);
            }}
          >
            <DeleteIcon />
          </IconButton>
          <IconButton
            onClick={() =>
              setSelectedEntityId(
                selectedEntityId === entity.id ? null : entity.id
              )
            }
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>
      </Box>
      {children}
    </Accordion>
  );
}
