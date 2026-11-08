import { Box, Typography } from "@mui/material";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { orderLinks } from "@shared/variant/render";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import { activeVariantSelector, setLinkOrder } from "@store/jobs/jobs-slice";
import { vaultSelector } from "@store/vault/vault-slice";

/**
 * The order of the links (LinkedIn, GitHub, ...) in this job. The vault list is not changed;
 * whether links show at all is a template setting (Style settings).
 */
export function JobLinks(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const { links } = useAppSelector(vaultSelector);
  const variant = useAppSelector(activeVariantSelector);
  const ordered = orderLinks(links, variant.linkOrder);

  if (ordered.length < 2) {
    return null;
  }

  function move(from: number, to: number): void {
    const ids = ordered.map((link) => link.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    dispatch(setLinkOrder({ jobId: variant.id, order: ids }));
  }

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.5,
        borderTop: `1px solid ${WORKSPACE_COLORS.border}`,
      }}
    >
      <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Links</Typography>
      <Typography
        sx={{ fontSize: 12.5, color: WORKSPACE_COLORS.muted, mb: 0.5 }}
      >
        Their order on this CV. Showing links at all is set on the template.
      </Typography>
      {ordered.map((link, index) => (
        <Box
          key={link.id}
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <SortingIcons
            index={index}
            swapFunction={move}
            isLastEntity={index === ordered.length - 1}
          />
          <Typography sx={{ fontSize: 13.5 }}>
            {link.label || link.url}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
