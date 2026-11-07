import { Box, IconButton, Typography } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { closestCenter, DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Item, Section } from "@custom-types/vault-types";
import { Variant } from "@custom-types/variant-types";
import { getItemLabel } from "@shared/variant/item-label";
import {
  sortBulletsByVariant,
  sortItemsByVariant,
} from "@shared/variant/render";
import { computeBulletOrders } from "@shared/variant/variant-utils";
import { levelLabel, tracksLevels } from "@shared/vault/vault-utils";
import { SortingIcons } from "@pages/editor-page/accordion/sorting-icons";
import {
  getDropIndex,
  SortableRow,
  useReorderSensors,
} from "@pages/editor-page/sections/job-section-items";
import { WORKSPACE_COLORS } from "@pages/workspace/workspace-tokens";
import { useAppDispatch } from "@store/store-helper";
import {
  setBulletOrders,
  setBulletSelection,
} from "@store/variants/variants-slice";

interface GroupProps {
  item: Item;
  variant: Variant;
  hasLevels: boolean;
  hasTitle: boolean;
}

function SkillGroup({
  item,
  variant,
  hasLevels,
  hasTitle,
}: GroupProps): JSX.Element {
  const dispatch = useAppDispatch();
  const sensors = useReorderSensors();
  const bullets = sortBulletsByVariant(item, variant.selection);
  const ids = bullets.map((bullet) => bullet.id);

  function move(bulletId: string, toIndex: number): void {
    dispatch(
      setBulletOrders({
        jobId: variant.id,
        itemId: item.id,
        orders: computeBulletOrders(item, variant, bulletId, toIndex),
      })
    );
  }

  return (
    <Box>
      {hasTitle && (
        <Typography
          sx={{ fontSize: 11, fontWeight: 700, color: WORKSPACE_COLORS.muted }}
        >
          {getItemLabel(item)}
        </Typography>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const index = getDropIndex(ids, event);
          if (index !== null) {
            move(String(event.active.id), index);
          }
        }}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {bullets.map((bullet, index) => {
            const isShown =
              variant.selection[item.id]?.bullets?.[bullet.id]?.isVisible !==
              false;
            return (
              <SortableRow key={bullet.id} id={bullet.id}>
                {(handle) => (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.25,
                      minHeight: 32,
                      borderBottom: `1px solid ${WORKSPACE_COLORS.border}`,
                    }}
                  >
                    {handle}
                    <IconButton
                      size="small"
                      aria-label={`${isShown ? "Hide" : "Show"} ${bullet.text}`}
                      aria-pressed={isShown}
                      onClick={() =>
                        dispatch(
                          setBulletSelection({
                            jobId: variant.id,
                            itemId: item.id,
                            bulletId: bullet.id,
                            change: { isVisible: !isShown },
                          })
                        )
                      }
                    >
                      {isShown ? (
                        <VisibilityIcon fontSize="inherit" />
                      ) : (
                        <VisibilityOffIcon fontSize="inherit" />
                      )}
                    </IconButton>
                    <Typography
                      sx={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: isShown ? 600 : 400,
                        color: isShown ? undefined : WORKSPACE_COLORS.muted,
                      }}
                    >
                      {bullet.text}
                    </Typography>
                    {hasLevels && (
                      <Typography
                        sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}
                      >
                        {levelLabel(bullet.rating)}
                      </Typography>
                    )}
                    <SortingIcons
                      index={index}
                      swapFunction={(_from, toIndex) =>
                        move(bullet.id, toIndex)
                      }
                      isLastEntity={index === bullets.length - 1}
                    />
                  </Box>
                )}
              </SortableRow>
            );
          })}
        </SortableContext>
      </DndContext>
    </Box>
  );
}

interface Props {
  section: Section;
  variant: Variant;
}

/** Every skill of the section in one list: show/hide and order for this variant */
export function SkillList({ section, variant }: Props): JSX.Element {
  const hasLevels = tracksLevels(section);
  const items = sortItemsByVariant(section.items, variant.selection).filter(
    (item) => variant.selection[item.id]?.isVisible !== false
  );
  const all = items.flatMap((item) => item.bullets);
  const shown = items
    .flatMap((item) =>
      item.bullets.map(
        (bullet) =>
          variant.selection[item.id]?.bullets?.[bullet.id]?.isVisible !== false
      )
    )
    .filter(Boolean).length;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
        <Typography sx={{ fontWeight: 700, flex: 1 }}>Skills</Typography>
        <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted }}>
          {shown} of {all.length} shown
        </Typography>
      </Box>
      <Box
        sx={{
          border: `1px solid ${WORKSPACE_COLORS.border}`,
          borderRadius: 1.5,
          px: 0.5,
        }}
      >
        {items.map((item) => (
          <SkillGroup
            key={item.id}
            item={item}
            variant={variant}
            hasLevels={hasLevels}
            hasTitle={items.length > 1}
          />
        ))}
      </Box>
      <Typography sx={{ fontSize: 12, color: WORKSPACE_COLORS.muted, mt: 0.5 }}>
        Hidden skills stay in your vault. Changing a level means editing the
        vault.
      </Typography>
    </Box>
  );
}
