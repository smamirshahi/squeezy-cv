import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
} from "@mui/material";
import { Bullet, Item } from "@custom-types/vault-types";
import { RewriteMode, RewriteResult } from "@custom-types/rewrite-types";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { batch } from "@store/history/history";
import { createApiClient } from "@store/persistence/api-client";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  setBulletSelection,
} from "@store/jobs/jobs-slice";
import { setBulletAlt, vaultSelector } from "@store/vault/vault-slice";

const MODES: { mode: RewriteMode; label: string }[] = [
  { mode: "shorten", label: "Shorten" },
  { mode: "extend", label: "Extend" },
  { mode: "rephrase", label: "Rephrase" },
];

interface Props {
  item: Item;
  bullet: Bullet;
}

/**
 * Shorten / Extend / Rephrase for one bullet. The proposal is only shown; "Use this" stores it as
 * an alternative wording of the vault bullet (its text never changes) and selects it for this job,
 * as one undo step. A rewording with things that are not in the CV is flagged and starts unticked.
 */
export function BulletAiActions({ item, bullet }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const api = useMemo(() => createApiClient(), []);
  const vault = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  const [busy, setBusy] = useState<RewriteMode | null>(null);
  const [error, setError] = useState<string>("");
  const [proposal, setProposal] = useState<RewriteResult | null>(null);
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);

  async function ask(mode: RewriteMode): Promise<void> {
    setBusy(mode);
    setError("");
    setProposal(null);
    try {
      const requirements = variant.tailor
        ? [
            ...variant.tailor.requirements.mustHave,
            ...variant.tailor.requirements.niceToHave,
          ]
        : undefined;
      const result = await api.rewriteBullet({
        itemId: item.id,
        bulletId: bullet.id,
        mode,
        requirements,
      });
      setProposal(result);
      setIsConfirmed(result.flags.length === 0);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "The rewording failed."
      );
    } finally {
      setBusy(null);
    }
  }

  function accept(): void {
    const section = vault.sections.find((s) =>
      s.items.some((i) => i.id === item.id)
    );
    if (!proposal || !section) {
      return;
    }
    dispatch(
      batch("AI wording", [
        setBulletAlt({
          sectionId: section.id,
          itemId: item.id,
          bulletId: bullet.id,
          kind: proposal.wording,
          text: proposal.text,
        }),
        setBulletSelection({
          jobId: variant.id,
          itemId: item.id,
          bulletId: bullet.id,
          change: { wording: proposal.wording },
        }),
      ])
    );
    setProposal(null);
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
        {MODES.map(({ mode, label }) => (
          <Button
            key={mode}
            size="small"
            variant="outlined"
            disabled={busy !== null}
            aria-label={`${label} bullet: ${bullet.text.slice(0, 30)}`}
            startIcon={
              busy === mode ? (
                <CircularProgress size={14} color="inherit" />
              ) : undefined
            }
            onClick={() => void ask(mode)}
            sx={{ py: 0, px: 0.75, fontSize: 11.5, minWidth: 0 }}
          >
            {busy === mode ? `${label}…` : label}
          </Button>
        ))}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mt: 0.5, py: 0 }}>
          {error}
        </Alert>
      )}
      {proposal && (
        <Box
          role="group"
          aria-label="Proposed wording"
          sx={{
            mt: 0.75,
            p: 0.75,
            border: `1px solid ${WORKSPACE_COLORS.border}`,
            borderRadius: 1,
            fontSize: 12.5,
          }}
        >
          <Box>{proposal.text}</Box>
          {proposal.flags.length > 0 && (
            <Alert severity="warning" sx={{ mt: 0.5, py: 0 }}>
              Check this: {proposal.flags.join("; ")}.
            </Alert>
          )}
          {proposal.flags.length > 0 && (
            <FormControlLabel
              label="I checked it is true"
              control={
                <Checkbox
                  size="small"
                  checked={isConfirmed}
                  onChange={(event) => setIsConfirmed(event.target.checked)}
                />
              }
            />
          )}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 0.5,
              mt: 0.5,
            }}
          >
            <Button size="small" onClick={() => setProposal(null)}>
              Discard
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={!isConfirmed}
              onClick={accept}
            >
              Use this wording
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
