import { createContext } from "react";

/**
 * The element of the workspace's right panel, when there is one. Item editors draw the form of
 * the chosen item into it; without a panel (a page rendered on its own) the form stays below the list.
 */
export const ItemPanelContext = createContext<HTMLElement | null>(null);
