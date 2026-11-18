/** An entry detail a template can leave out; every detail is shown unless its key is hidden */
export interface EntryDetail {
  key: string;
  label: string;
}

export const ENTRY_DETAILS: Record<
  "projects" | "education" | "experience",
  EntryDetail[]
> = {
  projects: [
    { key: "projects.technologies", label: "Technologies" },
    { key: "projects.link", label: "Link" },
    { key: "projects.description", label: "Description" },
  ],
  education: [
    { key: "education.fieldOfStudy", label: "Field of study" },
    { key: "education.location", label: "Location" },
    { key: "education.dissertation", label: "Dissertation title" },
    { key: "education.description", label: "Description or bullet points" },
  ],
  experience: [
    { key: "experience.location", label: "Location" },
    { key: "experience.description", label: "Description or bullet points" },
  ],
};

export function isDetailShown(
  hiddenDetails: readonly string[] | undefined,
  key: string
): boolean {
  return !(hiddenDetails ?? []).includes(key);
}
