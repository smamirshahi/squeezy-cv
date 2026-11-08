import { Dispatch } from "react";
import { UnknownAction } from "@reduxjs/toolkit";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Item } from "@custom-types/vault-types";
import { AltKind, setBulletAlt } from "@store/vault/vault-slice";

const ALT_KINDS: { kind: AltKind; label: string }[] = [
  { kind: "short", label: "Short" },
  { kind: "long", label: "Long" },
  { kind: "formal", label: "Formal" },
];

interface Props {
  sectionId: string;
  item: Item;
  draftDispatch: Dispatch<UnknownAction>;

  /** Edit the alternative wordings of each bullet point */
  shouldEditBullets?: boolean;
}

/**
 * For bullet-based items, the alternative wordings per bullet.
 * Alternative wordings are used later to tailor the CV; the main text is never changed here.
 */
export function ItemExtras({
  sectionId,
  item,
  draftDispatch,
  shouldEditBullets = false,
}: Props): JSX.Element {
  if (!shouldEditBullets) {
    return <></>;
  }

  return (
    <Accordion
      disableGutters
      variant="outlined"
      sx={{ mt: 2 }}
      // Mount the (many) inputs only while the panel is open, to keep the editor fast
      slotProps={{
        // eslint-disable-next-line @typescript-eslint/naming-convention -- `unmountOnExit` is the MUI prop name
        transition: { unmountOnExit: true },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>Alternative wordings</Typography>
      </AccordionSummary>
      <AccordionDetails
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        {item.bullets.map((bullet, index) => {
          const ref = { sectionId, itemId: item.id, bulletId: bullet.id };
          return (
            <Box
              key={bullet.id}
              sx={{ display: "flex", flexDirection: "column", gap: 1 }}
            >
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                {index + 1}. {bullet.text || "(empty)"}
              </Typography>
              {ALT_KINDS.map(({ kind, label }) => (
                <TextField
                  key={kind}
                  size="small"
                  multiline
                  label={`${label} wording of bullet ${index + 1}`}
                  value={bullet.alt?.[kind] ?? ""}
                  onChange={(event) =>
                    draftDispatch(
                      setBulletAlt({ ...ref, kind, text: event.target.value })
                    )
                  }
                />
              ))}
            </Box>
          );
        })}
      </AccordionDetails>
    </Accordion>
  );
}
