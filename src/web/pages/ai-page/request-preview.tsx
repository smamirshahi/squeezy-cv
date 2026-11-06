import { AI_PROVIDER_INFO } from "@shared/ai/providers";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { TailorRequest } from "@custom-types/tailor-types";
import {
  ApiError,
  TailorPreview,
  createApiClient,
} from "@store/persistence/api-client";

interface Props {
  isOpen: boolean;
  request: TailorRequest;
  onClose: () => void;
}

/** Shows what would be sent to the AI for this advert, with personal details already masked. Sends nothing. */
export function RequestPreview({
  isOpen,
  request,
  onClose,
}: Props): JSX.Element {
  const api = useMemo(() => createApiClient(), []);
  const [preview, setPreview] = useState<TailorPreview | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setPreview(null);
    setError("");
    api
      .previewTailor(request)
      .then(setPreview)
      .catch((caught: unknown) =>
        setError(
          caught instanceof ApiError || caught instanceof Error
            ? caught.message
            : "The preview failed."
        )
      );
    // Only when it opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, api]);

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>The exact request</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        {preview && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              {AI_PROVIDER_INFO[preview.provider].isOnline
                ? `This goes to ${AI_PROVIDER_INFO[preview.provider].recipient}.`
                : `This goes to your local ${AI_PROVIDER_INFO[preview.provider].label} model and stays on this computer.`}{" "}
              Name, email, phone, address and links are replaced by placeholders
              such as [Candidate Name]. Nothing has been sent by showing this.
            </Alert>
            {preview.calls.map((call, index) => (
              <Box key={call.promptName} sx={{ mb: 2 }}>
                <Typography fontWeight="bold">
                  Message {index + 1}: {call.promptName}
                  {index === 1
                    ? " (requirements shown are a stand-in for the answer to message 1)"
                    : ""}
                </Typography>
                <Typography variant="caption">Instructions</Typography>
                <Box
                  component="pre"
                  sx={{ whiteSpace: "pre-wrap", fontSize: 12, mt: 0 }}
                >
                  {call.system}
                </Box>
                <Typography variant="caption">Data</Typography>
                <Box
                  component="pre"
                  sx={{ whiteSpace: "pre-wrap", fontSize: 12, mt: 0 }}
                >
                  {call.input}
                </Box>
              </Box>
            ))}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
