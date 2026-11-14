import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@components/ui";
import { BulletsMode } from "@custom-types/bullets-types";
import { Item } from "@custom-types/vault-types";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { AiButton, AiIcon } from "@components/ai-button";
import {
  AiInfoButton,
  AiSettingsButton,
} from "@pages/workspace/ai-job-context";
import { BulletsProposal } from "@pages/workspace/bullets-proposal";
import { EmphasiseDialog } from "@pages/workspace/emphasise-dialog";
import { useBulletsAi } from "@pages/workspace/use-bullets-ai";

interface Props {
  item: Item;
}

const MODE_LABELS: Record<BulletsMode, string> = {
  make: "Make bullets",
  shorten: "Shorten",
  rephrase: "Rephrase",
  emphasise: "Emphasise",
};

/**
 * The bullets card of the inspector: Make bullets, Shorten, Rephrase and Emphasise on the job's
 * bullets of one item. (The Apply page has the same bullets inside the item's AI strip.)
 */
export function DescriptionBullets({ item }: Props): JSX.Element {
  const [isEmphasiseOpen, setIsEmphasiseOpen] = useState<boolean>(false);
  const {
    busy,
    error,
    proposal,
    ticked,
    setTicked,
    setProposal,
    replaceDescription,
    setReplaceDescription,
    description,
    hiddenFields,
    hasGenerated,
    requirements,
    currentTexts,
    ask,
    accept,
    useVaultBullets,
  } = useBulletsAi(item);

  return (
    <Box
      role="group"
      aria-label="Bullets from the description"
      sx={{
        border: `1px solid ${WORKSPACE_COLORS.aiBorder}`,
        borderRadius: 1.5,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1.25,
          bgcolor: WORKSPACE_COLORS.aiSoft,
          color: WORKSPACE_COLORS.aiText,
        }}
      >
        <AiIcon fontSize="inherit" />
        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
          Bullets from the description, for this job
        </Typography>
        <AiInfoButton hasEntry />
        <AiSettingsButton task="chat" />
      </Box>
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
        {description === "" ? (
          <Typography sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted }}>
            Write what you did in the Description of this item (In vault tab),
            save, and AI can make bullets from it for this job.
          </Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
              Uses the saved description (save first if you just changed it).
              Nothing changes until you pick “Use these bullets”.
            </Typography>
            {hiddenFields.includes("description") && (
              <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.aiText }}>
                The description is left out of this job, the bullets replace it.
                Use the eye next to Description to show it again.
              </Typography>
            )}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <AiButton
                size="small"
                variant="contained"
                disabled={busy !== null}
                startIcon={
                  busy === "make" ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : undefined
                }
                onClick={() => void ask("make")}
              >
                {busy === "make" ? "Making…" : MODE_LABELS.make}
              </AiButton>
              {currentTexts.length > 0 && (
                <AiButton
                  size="small"
                  variant="outlined"
                  disabled={busy !== null}
                  startIcon={
                    busy === "shorten" ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : undefined
                  }
                  onClick={() => void ask("shorten")}
                >
                  {busy === "shorten" ? "Shortening…" : MODE_LABELS.shorten}
                </AiButton>
              )}
              {currentTexts.length > 0 && requirements.length > 0 && (
                <AiButton
                  size="small"
                  variant="outlined"
                  disabled={busy !== null}
                  startIcon={
                    busy === "rephrase" ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : undefined
                  }
                  onClick={() => void ask("rephrase")}
                >
                  {busy === "rephrase" ? "Rephrasing…" : MODE_LABELS.rephrase}
                </AiButton>
              )}
              {currentTexts.length > 0 && requirements.length > 0 && (
                <AiButton
                  size="small"
                  variant="outlined"
                  disabled={busy !== null}
                  startIcon={
                    busy === "emphasise" ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : undefined
                  }
                  onClick={() => setIsEmphasiseOpen(true)}
                >
                  {busy === "emphasise" ? "Working…" : "Emphasise…"}
                </AiButton>
              )}
            </Box>
          </>
        )}
        {hasGenerated && (
          <Button size="small" onClick={useVaultBullets}>
            Use the vault’s bullets instead
          </Button>
        )}
        {error && (
          <Alert severity="error" sx={{ py: 0 }}>
            {error}
          </Alert>
        )}
        {proposal && (
          <BulletsProposal
            proposal={proposal}
            ticked={ticked}
            onTick={setTicked}
            replaceDescription={replaceDescription}
            onReplaceDescription={setReplaceDescription}
            onDiscard={() => setProposal(null)}
            onUse={accept}
          />
        )}
      </Box>
      <EmphasiseDialog
        isOpen={isEmphasiseOpen}
        onClose={() => setIsEmphasiseOpen(false)}
        target="bullets"
        confirmLabel="Emphasise"
        onConfirm={(selected) => void ask("emphasise", selected)}
      />
    </Box>
  );
}
