import { Box, IconButton, Typography } from "@components/ui";
import {
  VisibilityOffOutlined as VisibilityOffIcon,
  VisibilityOutlined as VisibilityIcon,
} from "@components/ui/icons";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { orderLinks } from "@shared/variant/render";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  setLinkOrder,
  setLinkShown,
} from "@store/jobs/jobs-slice";
import { vaultSelector } from "@store/vault/vault-slice";

/**
 * The order of the links (LinkedIn, GitHub, ...) in this job. The vault list is not changed;
 * whether links show at all is a template setting (Templates > Design).
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
        Their order on this CV, and the eye hides a link in this job only.
        Showing links at all is set on the template.
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
          <Typography
            sx={{
              fontSize: 13.5,
              flex: 1,
              color: variant.hiddenLinks?.includes(link.id)
                ? WORKSPACE_COLORS.muted
                : WORKSPACE_COLORS.text,
              textDecoration: variant.hiddenLinks?.includes(link.id)
                ? "line-through"
                : "none",
            }}
          >
            {link.label || link.url}
          </Typography>
          <IconButton
            size="small"
            aria-label={`${variant.hiddenLinks?.includes(link.id) ? "Show" : "Hide"} ${link.label || link.url} on this CV`}
            onClick={() =>
              dispatch(
                setLinkShown({
                  jobId: variant.id,
                  linkId: link.id,
                  isShown: variant.hiddenLinks?.includes(link.id) === true,
                })
              )
            }
          >
            {variant.hiddenLinks?.includes(link.id) ? (
              <VisibilityOffIcon fontSize="small" />
            ) : (
              <VisibilityIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
      ))}
    </Box>
  );
}
