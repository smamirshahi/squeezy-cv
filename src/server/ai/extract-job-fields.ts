import { JobFields, JobFieldsSchema } from "@custom-types/job-fields-types";
import { Vault } from "@custom-types/vault-types";
import { AiClient } from "@server/ai/ai-types";
import { personalOf } from "@shared/ai/redact-personal";

const WORK_MODES = new Set(["onsite", "hybrid", "remote"]);
const EMPLOYMENT_TYPES = new Set([
  "fullTime",
  "partTime",
  "contract",
  "freelance",
  "internship",
]);

/** Trimmed fields; a work mode or employment type the app does not know becomes "" */
function cleaned(fields: JobFields): JobFields {
  const workMode = fields.workMode?.trim() ?? "";
  const employmentType = fields.employmentType?.trim() ?? "";
  return {
    company: fields.company.trim(),
    role: fields.role.trim(),
    location: fields.location.trim(),
    advert: fields.advert.trim(),
    workMode: WORK_MODES.has(workMode) ? workMode : "",
    employmentType: EMPLOYMENT_TYPES.has(employmentType) ? employmentType : "",
  };
}

interface Options {
  isMaskingOrganisations?: boolean;
}

/**
 * Reads the text of a job page the user pasted (LinkedIn or any other) and returns the company,
 * role, location and the job description alone. Only the pasted text is sent, scrubbed of the
 * profile like the advert analysis. Nothing is stored here.
 */
export async function extractJobFields(
  ai: AiClient,
  vault: Vault,
  text: string,
  options: Options = {}
): Promise<JobFields> {
  const fields = await ai.generate({
    promptName: "extract-job-fields",
    input: text,
    schema: JobFieldsSchema,
    personal: personalOf(vault, options.isMaskingOrganisations === true),
  });
  return cleaned(fields);
}

/**
 * Fills the same fields from a job link: Gemini opens the page itself (URL context), so only the
 * link is sent, never CV data. Empty fields mean it could not read the page.
 */
export async function extractJobFromLink(
  ai: AiClient,
  url: string
): Promise<JobFields> {
  const fields = await ai.generate({
    promptName: "extract-job-link",
    input: url,
    schema: JobFieldsSchema,
  });
  return cleaned(fields);
}
