import { useMemo } from "react";
import { ResumeTemplates } from "../common/custom-types";
import { OneColumnTemplate } from "./one-column-template";
import { TwoColumnTemplate } from "./two-column-template";
import { useSelector } from "react-redux";
import { applicantSelector } from "../store/applicant/applicant-slice";

interface Props {
  template: ResumeTemplates;
}

export function TemplateSelection({ template }: Props): JSX.Element {
  const applicant = useSelector(applicantSelector);

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
