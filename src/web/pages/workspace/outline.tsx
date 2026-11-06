import { useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CloseIcon from "@mui/icons-material/Close";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { getItemLabel, shorten } from "@shared/variant/item-label";
import {
  sortBulletsByVariant,
  sortItemsByVariant,
} from "@shared/variant/render";
import {
  computeBulletOrders,
  computeItemOrders,
} from "@shared/variant/variant-utils";
import { moveSection } from "@pages/workspace/inspector";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { setSelectedBlock, updatePageStructure } from "@store/app/app-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  activeVariantSelector,
  setBulletOrders,
  setBulletSelection,
  setItemOrders,
  setItemSelection,
} from "@store/variants/variants-slice";
import { sectionsSelector } from "@store/vault/vault-slice";

const INDENT_PX = 16;
const HIDDEN_OPACITY = 0.5;

interface RowProps {
  level: number;
  label: string;
  isBold?: boolean;
  isHidden?: boolean;
  isSelected?: boolean;
  isEmphasised?: boolean;
  onEye?: () => void;
  onEmphasis?: () => void;
  onMove: (delta: -1 | 1) => void;
  onSelect?: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function Row(props: RowProps): JSX.Element {
  const { level, label, isHidden, isSelected, isEmphasised } = props;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        minHeight: 28,
        pl: `${6 + level * INDENT_PX}px`,
        pr: 1,
        bgcolor: isSelected ? WORKSPACE_COLORS.accentSoft : "transparent",
        boxShadow: isSelected
          ? `inset 3px 0 0 ${WORKSPACE_COLORS.accent}`
          : "none",
        "&:hover": { bgcolor: isSelected ? undefined : "#E3E6E9" },
      }}
    >
      {props.onEye ? (
        <IconButton
          size="small"
          aria-label={`${isHidden ? "Show" : "Hide"} ${label}`}
          onClick={props.onEye}
        >
          {isHidden ? (
            <VisibilityOffIcon fontSize="inherit" />
          ) : (
            <VisibilityIcon fontSize="inherit" />
          )}
        </IconButton>
      ) : (
        <Box sx={{ width: 28 }} />
      )}
      {props.onEmphasis && (
        <IconButton
          size="small"
          aria-label={`Emphasis ${label}`}
          aria-pressed={isEmphasised}
          color={isEmphasised ? "primary" : "default"}
          onClick={props.onEmphasis}
        >
          <FormatBoldIcon fontSize="inherit" />
        </IconButton>
      )}
      <Typography
        onClick={props.onSelect}
        sx={{
          flex: 1,
          minWidth: 0,
          ml: 0.5,
          fontSize: 13,
          fontWeight: props.isBold ? 700 : 400,
          opacity: isHidden ? HIDDEN_OPACITY : 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: props.onSelect ? "pointer" : "default",
        }}
      >
        {label}
      </Typography>
      <IconButton
        size="small"
        aria-label={`Move ${label} up`}
        disabled={props.isFirst}
        onClick={() => props.onMove(-1)}
      >
        <ArrowUpwardIcon fontSize="inherit" />
      </IconButton>
      <IconButton
        size="small"
        aria-label={`Move ${label} down`}
        disabled={props.isLast}
        onClick={() => props.onMove(1)}
      >
        <ArrowDownwardIcon fontSize="inherit" />
      </IconButton>
    </Box>
  );
}

interface Props {
  onClose: () => void;
}

/**
 * The outline (design B3): every section, item and bullet of the active variant with what
 * shows, in what order. Everything is a button, so it works from the keyboard; changes
 * are announced in a live region. Clicking an item selects it on the page.
 */
export function Outline({ onClose }: Props): JSX.Element {
  const dispatch = useAppDispatch();
  const variant = useAppSelector(activeVariantSelector);
  const sections = useAppSelector(sectionsSelector);
  const structure = useAppSelector((s) => s.app.structure);
  const selected = useAppSelector((s) => s.app.selectedBlock);
  const [announcement, setAnnouncement] = useState<string>("");

  const order = [...structure.fullWidth, ...structure.left, ...structure.right];
  const ordered = order
    .map((id) => sections.find((section) => section.id === id))
    .filter((section) => section !== undefined);

  function moveSectionBy(id: string, title: string, delta: -1 | 1): void {
    const next = moveSection(structure, id, delta);
    if (next) {
      dispatch(updatePageStructure(next));
      setAnnouncement(`Moved ${title} ${delta < 0 ? "up" : "down"}.`);
    }
  }

  return (
    <Box
      component="aside"
      aria-label="Outline"
      sx={{
        width: 330,
        flex: "none",
        bgcolor: WORKSPACE_COLORS.panel,
        borderRight: `1px solid ${WORKSPACE_COLORS.border}`,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 1.5,
          height: 44,
          borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
        }}
      >
        <Typography sx={{ fontWeight: 700 }}>Outline</Typography>
        <Typography
          sx={{ ml: 1, flex: 1, fontSize: 12, color: WORKSPACE_COLORS.muted }}
        >
          what shows, in what order
        </Typography>
        <IconButton size="small" aria-label="Close outline" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ flex: 1, overflow: "auto", py: 0.5 }}>
        {ordered.map((section, sectionIndex) => {
          const items = sortItemsByVariant(section.items, variant.selection);
          return (
            <Box key={section.id}>
              <Row
                level={0}
                isBold
                label={section.title}
                isFirst={sectionIndex === 0}
                isLast={sectionIndex === ordered.length - 1}
                onMove={(delta) =>
                  moveSectionBy(section.id, section.title, delta)
                }
              />
              {items.map((item, itemIndex) => {
                const choice = variant.selection[item.id];
                const isHidden = choice?.isVisible === false;
                const label = getItemLabel(item);
                const bullets = sortBulletsByVariant(item, variant.selection);
                return (
                  <Box key={item.id}>
                    <Row
                      level={1}
                      label={label}
                      isHidden={isHidden}
                      isEmphasised={choice?.emphasis === "high"}
                      isSelected={selected?.itemId === item.id}
                      isFirst={itemIndex === 0}
                      isLast={itemIndex === items.length - 1}
                      onSelect={() =>
                        dispatch(
                          setSelectedBlock({
                            sectionId: section.id,
                            itemId: item.id,
                          })
                        )
                      }
                      onEye={() =>
                        dispatch(
                          setItemSelection({
                            variantId: variant.id,
                            itemId: item.id,
                            change: { isVisible: isHidden },
                          })
                        )
                      }
                      onEmphasis={() =>
                        dispatch(
                          setItemSelection({
                            variantId: variant.id,
                            itemId: item.id,
                            change: {
                              emphasis:
                                choice?.emphasis === "high" ? "normal" : "high",
                            },
                          })
                        )
                      }
                      onMove={(delta) => {
                        dispatch(
                          setItemOrders({
                            variantId: variant.id,
                            orders: computeItemOrders(
                              section.items,
                              variant,
                              item.id,
                              itemIndex + delta
                            ),
                          })
                        );
                        setAnnouncement(
                          `Moved ${label} to position ${itemIndex + delta + 1} of ${items.length}.`
                        );
                      }}
                    />
                    {section.type !== "skills" &&
                      bullets.map((bullet, bulletIndex) => {
                        const bulletChoice = choice?.bullets?.[bullet.id];
                        const isBulletHidden =
                          bulletChoice?.isVisible === false;
                        const bulletLabel = shorten(bullet.text, 38);
                        return (
                          <Row
                            key={bullet.id}
                            level={2}
                            label={bulletLabel}
                            isHidden={isHidden || isBulletHidden}
                            isFirst={bulletIndex === 0}
                            isLast={bulletIndex === bullets.length - 1}
                            onEye={() =>
                              dispatch(
                                setBulletSelection({
                                  variantId: variant.id,
                                  itemId: item.id,
                                  bulletId: bullet.id,
                                  change: { isVisible: isBulletHidden },
                                })
                              )
                            }
                            onMove={(delta) => {
                              dispatch(
                                setBulletOrders({
                                  variantId: variant.id,
                                  itemId: item.id,
                                  orders: computeBulletOrders(
                                    item,
                                    variant,
                                    bullet.id,
                                    bulletIndex + delta
                                  ),
                                })
                              );
                              setAnnouncement(
                                `Moved a bullet of ${label} to position ${bulletIndex + delta + 1} of ${bullets.length}.`
                              );
                            }}
                          />
                        );
                      })}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
      <Box
        role="status"
        aria-live="polite"
        sx={{
          minHeight: 32,
          m: 1,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: 12,
          bgcolor: announcement ? "#1F1F1C" : "transparent",
          color: "#fff",
        }}
      >
        {announcement}
      </Box>
    </Box>
  );
}
