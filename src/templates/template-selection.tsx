import { useMemo } from "react";
import { OneColumnTemplate } from "./one-column-template";
import { TwoColumnTemplate } from "./two-column-template";
import { useSelector } from "react-redux";
import { cvDataSelector } from "../store/applicant/applicant-slice";
import { Style } from "../types/json-types";

interface Props {
  template: Style["template"];
}

export function TemplateSelection({ template }: Props): JSX.Element {
  const applicant = useSelector(cvDataSelector);

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
