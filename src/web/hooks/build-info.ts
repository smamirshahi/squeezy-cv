/** The short git commit this build was made from ("unknown" when it could not be found). */
export const APP_COMMIT: string =
  typeof __APP_COMMIT__ === "string" ? __APP_COMMIT__ : "unknown";

/** "v0.7.0", with the commit as a tooltip text: "Commit 1a2b3c4". */
export const COMMIT_TOOLTIP = `Commit ${APP_COMMIT}`;
