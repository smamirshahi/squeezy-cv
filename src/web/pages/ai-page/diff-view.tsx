import { Box, Chip, Typography } from "@mui/material";
import { DiffBullet, DiffItem, DiffSection } from "@shared/ai/diff-documents";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";

const STATUS_LABEL: Record<DiffItem["status"], string> = {
  same: "",
  added: "shown",
  removed: "hidden",
  changed: "changed",
};

function BulletLine({ bullet }: { bullet: DiffBullet }): JSX.Element {
  return (
    <Typography
      component="li"
      sx={{
        fontSize: 13,
        opacity: bullet.status === "same" ? 0.7 : 1,
        "& ins": {
          bgcolor: "var(--oks)",
          color: "var(--okt)",
          textDecoration: "none",
          borderRadius: "2px",
          px: "2px",
        },
        "& del": {
          bgcolor: "var(--ers)",
          color: "var(--ert)",
          borderRadius: "2px",
          px: "2px",
        },
      }}
    >
      {bullet.parts.map((part, index) =>
        part.kind === "ins" ? (
          <ins key={index}>{part.text}</ins>
        ) : part.kind === "del" ? (
          <del key={index}>{part.text}</del>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </Typography>
  );
}

/**
 * The proposal against the current variant, as text: sections and items that move, items shown or
 * hidden, highlights, and every reworded bullet word by word (green added, red removed).
 */
export function DiffView({ diff }: { diff: DiffSection[] }): JSX.Element {
  return (
    <Box
      role="region"
      aria-label="Differences"
      sx={{
        maxWidth: 720,
        mx: "auto",
        p: 2,
        bgcolor: WORKSPACE_COLORS.panel,
        color: WORKSPACE_COLORS.text,
        borderRadius: 1,
        border: `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
      {diff.map((section) => (
        <Box key={section.sectionId} sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }}>
            {section.title}
            {section.isMoved && (
              <Chip size="small" label="moved" sx={{ ml: 1 }} />
            )}
          </Typography>
          {section.items.map((item) => (
            <Box key={item.itemId} sx={{ mt: 1, pl: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {item.label}{" "}
                {STATUS_LABEL[item.status] && (
                  <Chip size="small" label={STATUS_LABEL[item.status]} />
                )}
                {item.emphasisChange && (
                  <Chip
                    size="small"
                    label={
                      item.emphasisChange === "on"
                        ? "highlighted"
                        : "highlight removed"
                    }
                    sx={{ ml: 0.5 }}
                  />
                )}
                {item.isMoved && (
                  <Chip size="small" label="moved" sx={{ ml: 0.5 }} />
                )}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 3 }}>
                {item.bullets.map((bullet) => (
                  <BulletLine key={bullet.bulletId} bullet={bullet} />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}
