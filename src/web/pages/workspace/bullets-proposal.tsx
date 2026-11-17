import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
} from "@components/ui";
import { BulletsResult } from "@custom-types/bullets-types";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

interface Props {
  proposal: BulletsResult;
  ticked: boolean[];
  onTick: (ticked: boolean[]) => void;
  isReplacingDescription: boolean;
  onReplaceDescription: (value: boolean) => void;
  onDiscard: () => void;
  onUse: () => void;
}

/**
 * The bullets AI made, to tick and use. Above the list, set apart from the bullets' own boxes,
 * is the choice to leave the description out of this job (on by default).
 */
export function BulletsProposal({
  proposal,
  ticked,
  onTick,
  isReplacingDescription,
  onReplaceDescription,
  onDiscard,
  onUse,
}: Props): JSX.Element {
  return (
    <Box
      role="group"
      aria-label="Proposed bullets"
      sx={{
        p: 0.75,
        border: `1px solid ${WORKSPACE_COLORS.border}`,
        borderRadius: 1,
        bgcolor: WORKSPACE_COLORS.panel,
        fontSize: 12.5,
      }}
    >
      <FormControlLabel
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          mx: 0,
          mb: 0.5,
          px: 1,
          border: `1px dashed ${WORKSPACE_COLORS.aiBorder}`,
          borderRadius: 1,
        }}
        control={
          <Checkbox
            size="small"
            color="secondary"
            checked={isReplacingDescription}
            onChange={(event) => onReplaceDescription(event.target.checked)}
          />
        }
        label={
          <Typography sx={{ fontSize: 12.5 }}>
            Replace the description with these bullets
          </Typography>
        }
      />
      {proposal.bullets.map((bullet, index) => (
        <Box key={index}>
          <FormControlLabel
            label={bullet.text}
            control={
              <Checkbox
                size="small"
                checked={ticked[index] ?? false}
                onChange={(event) =>
                  onTick(
                    ticked.map((value, at) =>
                      at === index ? event.target.checked : value
                    )
                  )
                }
              />
            }
          />
          {bullet.flags.length > 0 && (
            <Alert severity="warning" sx={{ py: 0 }}>
              Check this, it is not in your description:{" "}
              {bullet.flags.join("; ")}.
            </Alert>
          )}
        </Box>
      ))}
      <Box
        sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, mt: 0.5 }}
      >
        <Button size="small" onClick={onDiscard}>
          Discard
        </Button>
        <Button
          size="small"
          variant="contained"
          disabled={!ticked.some(Boolean)}
          onClick={onUse}
        >
          Use these bullets
        </Button>
      </Box>
    </Box>
  );
}
