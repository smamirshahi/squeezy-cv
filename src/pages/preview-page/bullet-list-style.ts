import { Style } from "@custom-types/styles-types";

/** The CSS `list-style-type` for the chosen bullet point icon */
export function getBulletListStyle(icon: Style["bulletPointIcon"]): {
  listStyleType: string;
} {
  switch (icon) {
    case "disc":
      return { listStyleType: "disc" };
    case "circle":
      return { listStyleType: "circle" };
    case "dash":
      return { listStyleType: '"– "' };
    case "square":
      return { listStyleType: "square" };
  }
}
