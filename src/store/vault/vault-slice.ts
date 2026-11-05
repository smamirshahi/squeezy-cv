import { PayloadAction, createSlice, nanoid } from "@reduxjs/toolkit";
import {
  Bullet,
  CURRENT_VAULT_VERSION,
  SectionType,
  Vault,
} from "@custom-types/vault-types";
import {
  findBullet,
  findItem,
  findSection,
  moveInArray,
  normalizeTags,
} from "@store/vault/vault-utils";

/** State of the vault slice: the facts, independent of any one CV */
export type VaultState = Vault;

export const initialState: VaultState = {
  version: CURRENT_VAULT_VERSION,
  profile: { fullName: "" },
  links: [],
  sections: [],
};

interface AddSectionPayload {
  id: string;
  type: SectionType;
  title: string;
}

interface ItemRef {
  sectionId: string;
  itemId: string;
}

interface BulletRef extends ItemRef {
  bulletId: string;
}

interface AddItemPayload {
  sectionId: string;
  id: string;
  fields: Record<string, string>;
  shouldShow: boolean;
}

export type AltKind = "short" | "long" | "formal";

/** Slice to access the vault */
const vaultSlice = createSlice({
  name: "vault",
  initialState,
  reducers: {
    setVault(_state, action: PayloadAction<Vault>) {
      return action.payload;
    },

    addSection: {
      reducer(state, action: PayloadAction<AddSectionPayload>) {
        state.sections.push({ ...action.payload, items: [] });
      },
      prepare(input: { type: SectionType; title: string; id?: string }) {
        return {
          payload: { ...input, id: input.id ?? nanoid() },
        };
      },
    },

    removeSection(state, action: PayloadAction<{ id: string }>) {
      state.sections = state.sections.filter((s) => s.id !== action.payload.id);
    },

    renameSection(state, action: PayloadAction<{ id: string; title: string }>) {
      const section = state.sections.find((s) => s.id === action.payload.id);
      if (section) {
        section.title = action.payload.title;
      }
    },

    /** Moves a section to a new position. The index is clamped to the valid range. */
    moveSection(state, action: PayloadAction<{ id: string; toIndex: number }>) {
      const from = state.sections.findIndex((s) => s.id === action.payload.id);
      moveInArray(state.sections, from, action.payload.toIndex);
    },

    addItem: {
      reducer(state, action: PayloadAction<AddItemPayload>) {
        const { sectionId, id, fields, shouldShow } = action.payload;
        findSection(state, sectionId)?.items.push({
          id,
          fields,
          bullets: [],
          tags: [],
          shouldShow,
        });
      },
      prepare(input: {
        sectionId: string;
        id?: string;
        fields?: Record<string, string>;
        shouldShow?: boolean;
      }) {
        return {
          payload: {
            sectionId: input.sectionId,
            id: input.id ?? nanoid(),
            fields: input.fields ?? {},
            shouldShow: input.shouldShow ?? true,
          },
        };
      },
    },

    removeItem(state, action: PayloadAction<ItemRef>) {
      const section = findSection(state, action.payload.sectionId);
      if (section) {
        section.items = section.items.filter(
          (i) => i.id !== action.payload.itemId
        );
      }
    },

    /** Merges the given fields into the item's fields. Other fields stay as they are. */
    updateItemFields(
      state,
      action: PayloadAction<ItemRef & { fields: Record<string, string> }>
    ) {
      const item = findItem(
        state,
        action.payload.sectionId,
        action.payload.itemId
      );
      if (item) {
        Object.assign(item.fields, action.payload.fields);
      }
    },

    moveItem(state, action: PayloadAction<ItemRef & { toIndex: number }>) {
      const section = findSection(state, action.payload.sectionId);
      if (section) {
        const from = section.items.findIndex(
          (i) => i.id === action.payload.itemId
        );
        moveInArray(section.items, from, action.payload.toIndex);
      }
    },

    setItemVisibility(
      state,
      action: PayloadAction<ItemRef & { shouldShow: boolean }>
    ) {
      const item = findItem(
        state,
        action.payload.sectionId,
        action.payload.itemId
      );
      if (item) {
        item.shouldShow = action.payload.shouldShow;
      }
    },

    /** Replaces the item's tags (trimmed, de-duplicated, empty ones dropped) */
    setItemTags(state, action: PayloadAction<ItemRef & { tags: string[] }>) {
      const item = findItem(
        state,
        action.payload.sectionId,
        action.payload.itemId
      );
      if (item) {
        item.tags = normalizeTags(action.payload.tags);
      }
    },

    addBullet: {
      reducer(
        state,
        action: PayloadAction<ItemRef & { id: string; text: string }>
      ) {
        const { sectionId, itemId, id, text } = action.payload;
        findItem(state, sectionId, itemId)?.bullets.push({
          id,
          text,
          tags: [],
        });
      },
      prepare(input: ItemRef & { id?: string; text?: string }) {
        return {
          payload: {
            sectionId: input.sectionId,
            itemId: input.itemId,
            id: input.id ?? nanoid(),
            text: input.text ?? "",
          },
        };
      },
    },

    /** Changes the canonical text, tags or rating of a bullet */
    updateBullet(
      state,
      action: PayloadAction<
        BulletRef & {
          update: { text?: string; tags?: string[]; rating?: number };
        }
      >
    ) {
      const { sectionId, itemId, bulletId, update } = action.payload;
      const bullet = findBullet(state, sectionId, itemId, bulletId);
      if (!bullet) {
        return;
      }
      if (update.text !== undefined) {
        bullet.text = update.text;
      }
      if (update.tags !== undefined) {
        bullet.tags = normalizeTags(update.tags);
      }
      if (update.rating !== undefined) {
        bullet.rating = update.rating;
      }
    },

    /** Sets one alternative wording. An empty text removes it; the canonical text is never touched. */
    setBulletAlt(
      state,
      action: PayloadAction<BulletRef & { kind: AltKind; text: string }>
    ) {
      const { sectionId, itemId, bulletId, kind, text } = action.payload;
      const bullet = findBullet(state, sectionId, itemId, bulletId);
      if (!bullet) {
        return;
      }
      const alt: NonNullable<Bullet["alt"]> = { ...bullet.alt };
      if (text.trim()) {
        alt[kind] = text;
      } else {
        delete alt[kind];
      }
      if (Object.keys(alt).length > 0) {
        bullet.alt = alt;
      } else {
        delete bullet.alt;
      }
    },

    removeBullet(state, action: PayloadAction<BulletRef>) {
      const { sectionId, itemId, bulletId } = action.payload;
      const item = findItem(state, sectionId, itemId);
      if (item) {
        item.bullets = item.bullets.filter((b) => b.id !== bulletId);
      }
    },

    moveBullet(state, action: PayloadAction<BulletRef & { toIndex: number }>) {
      const { sectionId, itemId, bulletId, toIndex } = action.payload;
      const item = findItem(state, sectionId, itemId);
      if (item) {
        const from = item.bullets.findIndex((b) => b.id === bulletId);
        moveInArray(item.bullets, from, toIndex);
      }
    },

    resetVaultState: () => initialState,
  },
  selectors: {
    vaultSelector: (state: VaultState) => state,
    sectionsSelector: (state: VaultState) => state.sections,
  },
});

export const { vaultSelector, sectionsSelector } = vaultSlice.selectors;

export const {
  setVault,
  addSection,
  removeSection,
  renameSection,
  moveSection,
  addItem,
  removeItem,
  updateItemFields,
  moveItem,
  setItemVisibility,
  setItemTags,
  addBullet,
  updateBullet,
  setBulletAlt,
  removeBullet,
  moveBullet,
  resetVaultState,
} = vaultSlice.actions;

export const vaultReducer = vaultSlice.reducer;
