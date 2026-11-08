import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
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
  /** Leave out when the order is automatic (no arrows then) */
  swapFunction?: (index1: number, index2: number) => void;
  removeFunction: (id: string) => void;
  /** Leave out when what is shown is decided per job elsewhere: no eye button then */
  onVisibilityChange?: (id: string, shouldShow: boolean) => void;
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
        sx={{
          display: "flex",
          justifyContent: "space-between",
          backgroundColor: WORKSPACE_COLORS.hover,
        }}
      >
        {swapFunction && (
          <SortingIcons
            index={accordionIndex}
            swapFunction={swapFunction}
            isLastEntity={isLastEntity}
          />
        )}
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
          {onVisibilityChange && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onVisibilityChange(entity.id, !entity.shouldShow);
              }}
            >
              {entity.shouldShow ? <VisibilityIcon /> : <VisibilityOffIcon />}
            </IconButton>
          )}

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
