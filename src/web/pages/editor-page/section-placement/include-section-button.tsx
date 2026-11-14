import { MouseEvent, useState } from "react";
import { Button, Menu, MenuItem } from "@components/ui";
import { AddOutlined as AddIcon } from "@components/ui/icons";
import { getPreviewPartLabel } from "@store/vault/section-labels";
import { sectionsSelector } from "@store/vault/vault-slice";
import { activeVariantSelector, setSectionShown } from "@store/jobs/jobs-slice";
import { useAppDispatch, useAppSelector } from "@store/store-helper";

/**
 * "Add section" of a job: brings back a section that was removed from it. It only offers
 * sections that exist in the vault; new ones are made there. Gone when none is left.
 */
export function IncludeSectionButton(): JSX.Element | null {
  const dispatch = useAppDispatch();
  const sections = useAppSelector(sectionsSelector);
  const variant = useAppSelector(activeVariantSelector);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const available = sections.filter((section) =>
    (variant.hiddenSections ?? []).includes(section.id)
  );

  if (available.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={(event: MouseEvent<HTMLElement>) =>
          setAnchor(event.currentTarget)
        }
        sx={{ alignSelf: "flex-start" }}
      >
        Add section
      </Button>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
      >
        {available.map((section) => (
          <MenuItem
            key={section.id}
            onClick={() => {
              dispatch(
                setSectionShown({
                  jobId: variant.id,
                  sectionId: section.id,
                  isShown: true,
                })
              );
              setAnchor(null);
            }}
          >
            {getPreviewPartLabel(section.id, sections)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
