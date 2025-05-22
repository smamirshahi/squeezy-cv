import { useMemo } from "react";
import { OneColumnTemplate } from "./one-column-template";
import { TwoColumnTemplate } from "./two-column-template";
import { cvDataSelector } from "../store/applicant/applicant-slice";
import { Style } from "../types/json-types";
import { useAppSelector } from "@src/store/store-helper";

interface Props {
  template: Style["template"];
}

export function TemplateSelection({ template }: Props): JSX.Element {
  const applicant = useAppSelector(cvDataSelector);

  const content = useMemo(() => {
    switch (template) {
      case "one-column":
        return <OneColumnTemplate />;

      case "two-column":
        return <TwoColumnTemplate />;

      default:
        throw new Error("Invalid template");
    }
  }, [template]);

  if (applicant === null) {
    return <></>;
  }

  return <>{content}</>;
}
