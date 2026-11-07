import { Array, Object, Static, String } from "runtypes";

/** What is sent to ask the AI where unsorted items belong: item words and the section names only. */
export const PlaceRequestSchema = Object({
  items: Array(Object({ itemId: String, label: String, text: String })),
  sections: Array(Object({ sectionId: String, title: String, type: String })),
});

/** What the model may answer: a section (short id) and a reason per item (short id) */
export const RawPlaceSchema = Object({
  placements: Array(
    Object({ id: String, section: String, reason: String.optional() })
  ),
});

export const PlaceResultSchema = Object({
  suggestions: Array(
    Object({ itemId: String, sectionId: String, reason: String })
  ),
  warnings: Array(String),
});

export type PlaceRequest = Static<typeof PlaceRequestSchema>;
export type PlaceResult = Static<typeof PlaceResultSchema>;

export const MAX_PLACE_ITEMS = 50;
export const MAX_PLACE_TEXT = 600;
