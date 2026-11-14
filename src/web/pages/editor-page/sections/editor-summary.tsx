import { TextField } from "@components/ui";
import { nanoid } from "@reduxjs/toolkit";
import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@store/store-helper";
import {
  addItem,
  initialState,
  setSection,
  updateItemFields,
  vaultSelector,
} from "@store/vault/vault-slice";
import { useVaultDraft } from "@pages/editor-page/use-vault-draft";

interface Props {
  /** Id of the summary section being edited */
  sectionId: string;
}

/** Shows the professional summary section in editor page */
export function EditorSummary({ sectionId }: Props): JSX.Element | null {
  const dispatch = useAppDispatch();
  const stored = useAppSelector(vaultSelector).sections.find(
    (s) => s.id === sectionId
  );
  const source = useMemo(
    () => ({ ...initialState, sections: stored ? [stored] : [] }),
    [stored]
  );

  const { draft, draftDispatch } = useVaultDraft(source, (applied) => {
    if (applied.sections[0]) {
      dispatch(setSection(applied.sections[0]));
    }
  });

  const item = draft.sections[0]?.items[0];

  function handleChange(text: string): void {
    if (item) {
      draftDispatch(
        updateItemFields({ sectionId, itemId: item.id, fields: { text } })
      );
    } else {
      draftDispatch(addItem({ sectionId, id: nanoid(), fields: { text } }));
    }
  }

  return (
    <TextField
      label="Professional Summary"
      variant="outlined"
      multiline
      value={item?.fields.text ?? ""}
      fullWidth
      sx={{
        mt: "20px",
      }}
      onChange={(event) => handleChange(event.target.value)}
    />
  );
}
