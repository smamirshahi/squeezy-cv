import type { ReactNode, ReactElement } from "react";

// This is a solution for not importing JSX from react every time in React 19.
// As soon as TypeScript supports it (currently support it for React 18), it can be removed
declare global {
  namespace JSX {
    type Element = ReactElement;
    interface ElementClass {
      render(): ReactNode;
    }
    interface IntrinsicElements {
      // You can replace this with specific elements if you want strict types
      [elemName: string]: Record<string, unknown>;
    }
  }
}
