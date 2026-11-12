import { useState } from "react";
import { Box, Button, Link, Popover, Typography } from "@mui/material";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

const SPONSOR_REGISTER_URL =
  "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers";
const SPONSOR_LICENCE_CHECK_URL = "https://sponsorlicencecheck.co.uk/";

/**
 * An optional helper on the job details page: explains what a sponsor licence means and links to
 * the official register and to SponsorLicenceCheck.co.uk. It makes no claim about the company and
 * sends nothing anywhere; the user checks the company there.
 */
export function SponsorshipCheck({
  company,
}: {
  company?: string;
}): JSX.Element {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const name = company?.trim() ?? "";

  async function copyName(): Promise<void> {
    try {
      await navigator.clipboard.writeText(name);
      setIsCopied(true);
    } catch {
      setIsCopied(false);
    }
  }

  return (
    <>
      <Button
        size="small"
        aria-haspopup="dialog"
        onClick={(event) => {
          setIsCopied(false);
          setAnchor(event.currentTarget);
        }}
        sx={{ justifySelf: "start" }}
      >
        Check visa sponsorship
      </Button>
      <Popover
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            "aria-label": "Visa sponsorship",
            sx: { maxWidth: 420, width: "calc(100vw - 32px)", p: 2 },
          },
        }}
      >
        <Box sx={{ display: "grid", gap: 1.5 }}>
          <Typography sx={{ fontWeight: 600 }}>Visa sponsorship</Typography>
          <Typography sx={{ fontSize: 14 }}>
            In the UK, only employers on the Home Office register of licensed
            sponsors can sponsor a Skilled Worker visa. Check whether this
            company is on it.
          </Typography>
          <Typography sx={{ fontSize: 13, color: WORKSPACE_COLORS.muted }}>
            A licence means the company can sponsor, not that it will for this
            role: the role must also meet the salary and occupation rules. A
            company that is not listed may still be covered by a parent
            company&apos;s licence, or be registered under another name.
          </Typography>
          {name && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography sx={{ fontSize: 14, flex: 1, minWidth: 0 }} noWrap>
                Company: <strong>{name}</strong>
              </Typography>
              <Button size="small" onClick={() => void copyName()}>
                {isCopied ? "Copied" : "Copy name"}
              </Button>
            </Box>
          )}
          <Box sx={{ display: "grid", gap: 0.5, fontSize: 14 }}>
            <Link
              href={SPONSOR_REGISTER_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Official register of licensed sponsors (GOV.UK)
            </Link>
            <Link
              href={SPONSOR_LICENCE_CHECK_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              SponsorLicenceCheck.co.uk
            </Link>
          </Box>
        </Box>
      </Popover>
    </>
  );
}
