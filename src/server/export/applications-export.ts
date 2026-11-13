import { APP_VERSION } from "@shared/version";
import { withExportMeta } from "@shared/migration/export-meta";
import { CURRENT_APPLICATION_VERSION } from "@custom-types/application-types";
import { CvStorage } from "@shared/storage/cv-storage";
import { createZip, ZipEntry } from "@server/export/zip";

/** One application that could not be exported whole, and why */
interface ExportProblem {
  id: string;
  reason: string;
}

export interface ApplicationsExport {
  fileName: string;
  zip: Buffer;
  exportedCount: number;
  problems: ExportProblem[];
}

const CSV_COLUMNS = [
  "id",
  "company",
  "role",
  "job",
  "template",
  "status",
  "appliedAt",
  "updatedAt",
] as const;

function csvCell(value: string): string {
  // a leading = + - @ would be read as a formula by a spreadsheet
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Collects every application (data and the PDF that was sent) into one ZIP: a folder per
 * application, `index.json` with the problems and `summary.csv`. A damaged application is
 * listed as a problem and never stops the others.
 */
export async function buildApplicationsExport(
  storage: CvStorage,
  now: Date
): Promise<ApplicationsExport> {
  const summaries = await storage.listApplications();
  const entries: ZipEntry[] = [];
  const problems: ExportProblem[] = [];
  const rows: string[][] = [];

  for (const summary of summaries) {
    if (summary.isCorrupt) {
      problems.push({
        id: summary.id,
        reason: "The application file is damaged and was not exported.",
      });
      continue;
    }
    let hasCv = true;
    try {
      const application = await storage.loadApplication(summary.id);
      hasCv = application.submitted !== undefined;
      entries.push({
        name: `${summary.id}/application.json`,
        data: Buffer.from(
          JSON.stringify(
            withExportMeta(
              application,
              "application",
              CURRENT_APPLICATION_VERSION,
              now
            ),
            null,
            2
          ),
          "utf8"
        ),
      });
    } catch (error: unknown) {
      problems.push({ id: summary.id, reason: describe(error) });
      continue;
    }
    try {
      entries.push({
        name: `${summary.id}/cv.pdf`,
        data: Buffer.from(await storage.loadApplicationPdf(summary.id)),
      });
    } catch (error: unknown) {
      // Applied elsewhere without a CV: having no PDF is normal
      if (hasCv) {
        problems.push({
          id: summary.id,
          reason: `The PDF is missing: ${describe(error)}`,
        });
      }
    }
    rows.push([
      summary.id,
      summary.company,
      summary.role,
      summary.jobName,
      summary.templateName,
      summary.status,
      summary.appliedAt,
      summary.updatedAt,
    ]);
  }

  const exportedCount = rows.length;
  const csv = [
    CSV_COLUMNS.join(","),
    ...rows.map((r) => r.map(csvCell).join(",")),
  ]
    .join("\n")
    .concat("\n");
  const index = {
    appVersion: APP_VERSION,
    exportedAt: now.toISOString(),
    exportedCount,
    problems,
  };

  const zip = createZip([
    {
      name: "index.json",
      data: Buffer.from(
        JSON.stringify(withExportMeta(index, "application", 1, now), null, 2),
        "utf8"
      ),
    },
    { name: "summary.csv", data: Buffer.from(csv, "utf8") },
    ...entries,
  ]);

  return {
    fileName: `cv-builder-applications-${now.toISOString().slice(0, 10)}.zip`,
    zip,
    exportedCount,
    problems,
  };
}
