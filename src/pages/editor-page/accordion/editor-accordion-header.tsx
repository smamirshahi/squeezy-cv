import {
  Accordion,
  AccordionSummary,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { PropsWithChildren, useState } from "react";
import { Experience } from "@custom-types/experience-types";

interface Props {
  accordionIndex: number;
  swapFunction: (index1: number, index2: number) => void;
  removeFunction: (id: string) => void;
  updateFunction: (id: string, update: Partial<Experience>) => void;
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
  updateFunction,
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
        <Box display="flex">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              swapFunction(accordionIndex, accordionIndex - 1);
            }}
            disabled={accordionIndex === 0}
          >
            <ArrowUpwardIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              swapFunction(accordionIndex, accordionIndex + 1);
            }}
            disabled={isLastEntity}
          >
            <ArrowDownwardIcon fontSize="small" />
          </IconButton>
        </Box>
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
              updateFunction(entity.id, {
                shouldShow: !entity.shouldShow,
              });
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
