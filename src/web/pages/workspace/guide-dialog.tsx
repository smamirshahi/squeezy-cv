import { ReactNode } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { isBrowserMode } from "@store/persistence/browser/storage-mode";
import { useViewport } from "@hooks/use-viewport";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        component="h3"
        sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}
      >
        {title}
      </Typography>
      <Box sx={{ fontSize: 14, lineHeight: 1.6 }}>{children}</Box>
    </Box>
  );
}

/** What happens to the data, in plain words */
function PrivacyNote(): JSX.Element {
  const isBrowser = isBrowserMode();
  return (
    <>
      <Section title="Where your data is">
        {isBrowser ? (
          <>
            Your CV, jobs, templates and applications are stored in{" "}
            <b>this browser</b> (its own database, IndexedDB). They are never
            uploaded to a server of ours: the website only delivers the app,
            there is no account and no database behind it, and nothing is
            tracked.
          </>
        ) : (
          <>
            Your data is saved as files in the <code>data</code> folder on this
            computer. Nothing is sent anywhere unless you use an online AI
            provider.
          </>
        )}
      </Section>
      <Section title="What AI sends">
        AI is optional. When you use it, the text of that request goes to the
        provider you chose (Claude, Gemini or Groq), or stays on this computer
        with Ollama. You see the exact request first, in the <b>Send to AI</b>{" "}
        window.
        {isBrowser && (
          <>
            {" "}
            The request goes straight from your browser to the provider, using
            your own key.
          </>
        )}{" "}
        Free plans of some providers may keep or use what you send, so use
        Ollama for anything sensitive.
      </Section>
      <Section title="Masking is best effort">
        Before sending, the app replaces your name, contact details, links and
        the names of employers and schools with placeholders, and puts them back
        in the answer. It does its best, but nothing is guaranteed: a detail
        written in an unusual way, or inside a free text, can slip through.
        Dates and wording can also identify a person. Check the Send to AI
        preview, and do not send what you cannot accept leaving your device.
      </Section>
      {isBrowser && (
        <Section title="Your AI key">
          The key you enter in Settings is kept in this browser only and sent
          only to the provider it belongs to. It is never in a backup. Set a
          spending limit with the provider.
        </Section>
      )}
      <Section title="Deleting everything">
        Clearing this site's data in your browser removes your CV for good, so
        download a backup first if you want to keep it.
      </Section>
    </>
  );
}

/** The privacy note, opened from the About dialog */
export function GuideDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): JSX.Element {
  const isPhone = useViewport() === "phone";
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      fullScreen={isPhone}
      maxWidth="sm"
      aria-labelledby="guide-title"
    >
      <DialogTitle
        id="guide-title"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontSize: 16,
          fontWeight: 600,
          borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        Privacy note
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" aria-label="Close" onClick={onClose}>
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: "20px !important" }}>
        <PrivacyNote />
      </DialogContent>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          px: 3,
          py: 1.5,
          borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Close
        </Button>
      </Box>
    </Dialog>
  );
}
