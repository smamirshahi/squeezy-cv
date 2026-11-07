import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Section } from "@custom-types/vault-types";
import { PlaceResult } from "@custom-types/place-types";
import { getItemLabel } from "@shared/variant/item-label";
import { moveTargets } from "@shared/vault/unsorted";
import {
  AiStatus,
  ApiError,
  createApiClient,
  taskProvider,
} from "@store/persistence/api-client";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { moveItemToSection, vaultSelector } from "@store/vault/vault-slice";

/** The item's words for the AI: every field value and bullet, nothing else */
function itemText(section: Section["items"][number]): string {
  return [
    ...Object.values(section.fields),
    ...section.bullets.map((b) => b.text),
  ]
    .filter((part) => part.trim() !== "")
    .join(". ");
}

/**
 * "Ask AI where these belong" for the Unsorted section. The AI only suggests; an item moves
 * when the user accepts the suggestion.
 */
export function UnsortedPlacement({
  section,
}: {
  section: Section;
}): JSX.Element {
  const dispatch = useAppDispatch();
  const vault = useAppSelector(vaultSelector);
  const api = useMemo(() => createApiClient(), []);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [result, setResult] = useState<PlaceResult | null>(null);
  const [error, setError] = useState<string>("");
  const ai = status ? taskProvider(status, "place") : null;
  const targets = moveTargets(vault, section.id);

  useEffect(() => {
    api
      .getAiStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [api]);

  async function ask(): Promise<void> {
    setIsAsking(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await api.suggestPlacement({
          items: section.items.map((item) => ({
            itemId: item.id,
            label: getItemLabel(item),
            text: itemText(item),
          })),
          sections: targets.map((target) => ({
            sectionId: target.id,
            title: target.title,
            type: target.type,
          })),
        })
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof Error
          ? caught.message
          : "The AI request failed."
      );
    } finally {
      setIsAsking(false);
    }
  }

  // Only suggestions for items still here and sections still there
  const suggestions = (result?.suggestions ?? []).filter(
    (suggestion) =>
      section.items.some((item) => item.id === suggestion.itemId) &&
      targets.some((target) => target.id === suggestion.sectionId)
  );
  const titleOf = (sectionId: string): string =>
    targets.find((target) => target.id === sectionId)?.title ?? "";
  const labelOf = (itemId: string): string => {
    const item = section.items.find((entry) => entry.id === itemId);
    return item ? getItemLabel(item) : "";
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
      <Typography sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}>
        Drop anything here without choosing a section. Move an item with
        &quot;Move to section&quot; on the item, or ask the AI to suggest where
        each belongs. Unsorted is only on a CV if a job includes it.
      </Typography>
      {ai?.isConfigured && (
        <>
          <Button
            size="small"
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
            disabled={isAsking || section.items.length === 0}
            onClick={() => void ask()}
          >
            Ask AI where these belong
          </Button>
          <Typography sx={{ fontSize: 11.5, color: WORKSPACE_COLORS.muted }}>
            {ai.info.isOnline
              ? `Sends item titles and text and section names to ${ai.info.recipient}; not your name or contact details.`
              : "Item text goes to your local model only."}
          </Typography>
        </>
      )}
      {isAsking && <CircularProgress size={18} />}
      {error && <Alert severity="error">{error}</Alert>}
      {result && (
        <Box
          role="region"
          aria-label="AI placement suggestions"
          sx={{
            p: 1,
            borderRadius: 1,
            bgcolor: WORKSPACE_COLORS.aiSoft,
            color: WORKSPACE_COLORS.aiText,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
            The AI suggests
          </Typography>
          {suggestions.length === 0 && (
            <Typography sx={{ fontSize: 12 }}>
              Nothing usable. Move items by hand.
            </Typography>
          )}
          {suggestions.map((suggestion) => (
            <Box
              key={suggestion.itemId}
              sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}
            >
              <Typography sx={{ flex: 1, fontSize: 12.5 }}>
                <strong>{labelOf(suggestion.itemId)}</strong> to{" "}
                <strong>{titleOf(suggestion.sectionId)}</strong>
                {suggestion.reason ? `: ${suggestion.reason}` : ""}
              </Typography>
              <Button
                size="small"
                variant="contained"
                aria-label={`Move ${labelOf(suggestion.itemId)} to ${titleOf(suggestion.sectionId)}`}
                onClick={() =>
                  dispatch(
                    moveItemToSection({
                      sectionId: section.id,
                      itemId: suggestion.itemId,
                      toSectionId: suggestion.sectionId,
                    })
                  )
                }
              >
                Move
              </Button>
            </Box>
          ))}
          {result.warnings.map((warning) => (
            <Typography key={warning} sx={{ fontSize: 11.5, mt: 0.5 }}>
              {warning}
            </Typography>
          ))}
          <Button size="small" sx={{ mt: 1 }} onClick={() => setResult(null)}>
            Dismiss
          </Button>
        </Box>
      )}
    </Box>
  );
}
