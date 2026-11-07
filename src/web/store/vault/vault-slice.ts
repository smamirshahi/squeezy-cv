import { PayloadAction, createSlice, nanoid } from "@reduxjs/toolkit";
import {
  Bullet,
  ItemOpinion,
  LinkItem,
  Profile,
  Section,
  SectionType,
  Vault,
} from "@custom-types/vault-types";
import { createDefaultVault } from "@shared/vault/default-vault";
import {
  findBullet,
  findItem,
  findSection,
  isYearsAcceptable,
  moveInArray,
  normalizeTags,
} from "@shared/vault/vault-utils";

/** State of the vault slice: the facts, independent of any one CV */
export type VaultState = Vault;

export const initialState: VaultState = createDefaultVault();

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

    /** Replaces the section that has the same id (used to apply an edited draft) */
    setSection(state, action: PayloadAction<Section>) {
      const index = state.sections.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.sections[index] = action.payload;
      }
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

    /** Turns levels on or off for a skills section. The stored levels are kept. */
    setSectionTracksLevel(
      state,
      action: PayloadAction<{ id: string; tracksLevel: boolean }>
    ) {
      const section = state.sections.find((s) => s.id === action.payload.id);
      if (section) {
        section.tracksLevel = action.payload.tracksLevel;
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

    /** Sets the private notes of an item (empty removes them) */
    setItemNotes(state, action: PayloadAction<ItemRef & { notes: string }>) {
      const item = findItem(
        state,
        action.payload.sectionId,
        action.payload.itemId
      );
      if (item) {
        if (action.payload.notes) {
          item.notes = action.payload.notes;
        } else {
          delete item.notes;
        }
      }
    },

    /** Sets how the user feels about an item (undefined = not set) */
    setItemOpinion(
      state,
      action: PayloadAction<ItemRef & { opinion?: ItemOpinion }>
    ) {
      const item = findItem(
        state,
        action.payload.sectionId,
        action.payload.itemId
      );
      if (item) {
        if (action.payload.opinion) {
          item.opinion = action.payload.opinion;
        } else {
          delete item.opinion;
        }
      }
    },

    addBullet: {
      reducer(
        state,
        action: PayloadAction<
          ItemRef & { id: string; text: string; rating?: number }
        >
      ) {
        const { sectionId, itemId, id, text, rating } = action.payload;
        const bullet: Bullet = { id, text, tags: [] };
        if (rating !== undefined) {
          bullet.rating = rating;
        }
        findItem(state, sectionId, itemId)?.bullets.push(bullet);
      },
      prepare(
        input: ItemRef & { id?: string; text?: string; rating?: number }
      ) {
        return {
          payload: {
            sectionId: input.sectionId,
            itemId: input.itemId,
            id: input.id ?? nanoid(),
            text: input.text ?? "",
            rating: input.rating,
          },
        };
      },
    },

    /** Replaces all bullets of an item (e.g. after editing them as one text block) */
    setItemBullets(
      state,
      action: PayloadAction<ItemRef & { bullets: Bullet[] }>
    ) {
      const item = findItem(
        state,
        action.payload.sectionId,
        action.payload.itemId
      );
      if (item) {
        item.bullets = action.payload.bullets;
      }
    },

    /** Changes the canonical text, tags or rating of a bullet */
    updateBullet(
      state,
      action: PayloadAction<
        BulletRef & {
          update: {
            text?: string;
            tags?: string[];
            rating?: number;
            /** null removes the years */
            years?: number | null;
          };
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
      if (update.years === null) {
        delete bullet.years;
      } else if (
        update.years !== undefined &&
        isYearsAcceptable(update.years)
      ) {
        bullet.years = update.years;
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

    /** Merges the given values into the profile. Pass `undefined` for an optional field to clear it. */
    updateProfile(state, action: PayloadAction<Partial<Profile>>) {
      Object.assign(state.profile, action.payload);
    },

    /** Replaces the whole profile (used to apply an edited draft) */
    setProfile(state, action: PayloadAction<Profile>) {
      state.profile = action.payload;
    },

    /** Replaces all links (used to apply an edited draft) */
    setLinks(state, action: PayloadAction<LinkItem[]>) {
      state.links = action.payload;
    },

    addLink: {
      reducer(
        state,
        action: PayloadAction<{ id: string; label: string; url: string }>
      ) {
        state.links.push({ ...action.payload, tags: [] });
      },
      prepare(input: { label?: string; url?: string; id?: string }) {
        return {
          payload: {
            id: input.id ?? nanoid(),
            label: input.label ?? "",
            url: input.url ?? "",
          },
        };
      },
    },

    updateLink(
      state,
      action: PayloadAction<{
        id: string;
        update: { label?: string; url?: string; tags?: string[] };
      }>
    ) {
      const link = state.links.find((l) => l.id === action.payload.id);
      if (!link) {
        return;
      }
      const { label, url, tags } = action.payload.update;
      if (label !== undefined) {
        link.label = label;
      }
      if (url !== undefined) {
        link.url = url;
      }
      if (tags !== undefined) {
        link.tags = normalizeTags(tags);
      }
    },

    removeLink(state, action: PayloadAction<{ id: string }>) {
      state.links = state.links.filter((l) => l.id !== action.payload.id);
    },

    moveLink(state, action: PayloadAction<{ id: string; toIndex: number }>) {
      const from = state.links.findIndex((l) => l.id === action.payload.id);
      moveInArray(state.links, from, action.payload.toIndex);
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
  setSection,
  addSection,
  removeSection,
  renameSection,
  setSectionTracksLevel,
  moveSection,
  addItem,
  removeItem,
  updateItemFields,
  moveItem,
  setItemVisibility,
  setItemTags,
  setItemNotes,
  setItemOpinion,
  addBullet,
  setItemBullets,
  updateBullet,
  setBulletAlt,
  removeBullet,
  moveBullet,
  updateProfile,
  setProfile,
  setLinks,
  addLink,
  updateLink,
  removeLink,
  moveLink,
  resetVaultState,
} = vaultSlice.actions;

export const vaultReducer = vaultSlice.reducer;
