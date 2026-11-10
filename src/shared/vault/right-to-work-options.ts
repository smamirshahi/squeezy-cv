/**
 * Ready-made wordings for the optional right-to-work line in Main Info.
 * The user may pick one or type their own text; only the text is stored.
 * The two bracketed parts of the last "other visa" wording are meant to be replaced.
 */
export const RIGHT_TO_WORK_OPTIONS = [
  "Right to work in the UK: British/Irish citizen; no sponsorship required.",
  "Right to work in the UK: settled status; no sponsorship required.",
  "Right to work in the UK: pre-settled status; may require sponsorship in the future.",
  "Right to work in the UK: Skilled Worker visa (employer-specific); requires new sponsorship to change employer.",
  "Right to work in the UK: Global Talent visa; no sponsorship required.",
  "Right to work in the UK: Graduate visa; sponsorship required after it ends.",
  "Right to work in the UK: Student visa (work limited); sponsorship required after it ends.",
  "Right to work in the UK: Family/partner visa; no sponsorship required.",
  "Right to work in the UK: [visa type]; [sponsorship text].",
  "Requires Skilled Worker visa sponsorship.",
] as const;
