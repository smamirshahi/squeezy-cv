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

export type GuideKind = "guide" | "privacy";

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

function List({ items }: { items: ReactNode[] }): JSX.Element {
  return (
    <Box component="ul" sx={{ m: 0, pl: 2.5, display: "grid", gap: 0.5 }}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </Box>
  );
}

/** How to use the app, for someone who just opened the link */
function UserGuide(): JSX.Element {
  const isBrowser = isBrowserMode();
  return (
    <>
      <Section title="The idea">
        You keep every fact about your career once, in the <b>Vault</b>. For
        each application you make a <b>job</b>: it picks a <b>template</b> (the
        look) and chooses what to show and how it is worded. You see the A4 page
        as you work and save it as a PDF.
      </Section>
      {isBrowser && (
        <Section title="Get started">
          <List
            items={[
              <>Open the link. There is nothing to install or sign up for.</>,
              <>
                Optional: install it as an app (the <b>Data</b> button, or your
                browser's install icon). It then opens in its own window and
                works offline.
              </>,
              <>
                Fill in the Vault, or paste your old CV text to have it sorted
                (that uses AI, see Privacy).
              </>,
              <>
                Make a job for each application, then <b>Export PDF</b>. In the
                print window choose <b>Save as PDF</b>.
              </>,
            ]}
          />
        </Section>
      )}
      <Section title="Back up your data">
        {isBrowser ? (
          <>
            Your CV is stored <b>only in this browser on this device</b>. If you
            clear the site data, use a private window or switch browser or
            device, it is not there. Press <b>Data</b> and{" "}
            <b>Download backup</b> now and then, and keep the file somewhere
            safe. To move to another device, download a backup there and use{" "}
            <b>Restore from backup</b> here.
          </>
        ) : (
          <>
            Your data is in the <code>data</code> folder. <b>Data</b> also lets
            you download one backup file and restore it.
          </>
        )}
      </Section>
      <Section title="Good to know">
        <List
          items={[
            <>
              Applications keep a frozen copy of the CV you sent, so later edits
              never change it.
            </>,
            <>
              Everything that uses AI is marked with a purple sparkle. AI only
              proposes; you decide what goes on the CV.
            </>,
            ...(isBrowser
              ? [
                  <>
                    For AI, add your own key in <b>Settings</b>. It stays in
                    this browser and is not part of a backup.
                  </>,
                  <>
                    Safari on iPhone can delete the data of a website you have
                    not opened for about a week unless it is added to the Home
                    Screen. Install it and keep a backup.
                  </>,
                ]
              : []),
          ]}
        />
      </Section>
    </>
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

/** The user guide or the privacy note, opened from the About dialog */
export function GuideDialog({
  kind,
  onClose,
}: {
  kind: GuideKind | null;
  onClose: () => void;
}): JSX.Element {
  const isPhone = useViewport() === "phone";
  const title = kind === "privacy" ? "Privacy note" : "How to use CV Builder";
  return (
    <Dialog
      open={kind !== null}
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
        {title}
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" aria-label="Close" onClick={onClose}>
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: "20px !important" }}>
        {kind === "privacy" ? <PrivacyNote /> : <UserGuide />}
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
