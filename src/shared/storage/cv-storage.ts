import {
  Application,
  ApplicationSummary,
} from "@custom-types/application-types";
import { CvFile } from "@custom-types/vault-types";
import { Candidate } from "@custom-types/candidate-types";
import { Job } from "@custom-types/job-types";
import { Template } from "@custom-types/template-types";

export type StorageErrorCode = "not_found" | "corrupt" | "invalid_id";

/** Something the caller can understand and report (as opposed to a bug) */
export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = "StorageError";
    this.code = code;
  }
}

export interface TemplateSummary {
  id: string;
  name: string;
  isCorrupt: boolean;
}

export interface JobSummary {
  id: string;
  name: string;
  templateId: string;
  company?: string;
  role?: string;
  stage?: "draft" | "ready";
  /** When the job was moved to Deleted (missing = not deleted) */
  deletedAt?: string;
  createdAt: string;
  isCorrupt: boolean;
}

/**
 * Where the CV data lives. The server only talks to this interface, so another place
 * (e.g. a hosted database) can be added later without touching the routes.
 */
export interface CvStorage {
  /** Throws StorageError "not_found" if nothing was saved yet, "corrupt" if it cannot be read */
  loadVault(): Promise<CvFile>;
  saveVault(file: CvFile): Promise<void>;

  /**
   * Templates and jobs. While there are no job files but `variants/*.json` exist, each variant
   * is read as one template (`template-<id>`) and one job (`<id>`); the first save or delete
   * of a template or job writes them all out first. Nothing is deleted from `variants/`.
   */
  listTemplates(): Promise<TemplateSummary[]>;
  loadTemplate(id: string): Promise<Template>;
  saveTemplate(template: Template): Promise<void>;
  /** Throws StorageError "not_found" if there is no such template */
  deleteTemplate(id: string): Promise<void>;

  listJobs(): Promise<JobSummary[]>;
  loadJob(id: string): Promise<Job>;
  saveJob(job: Job): Promise<void>;
  /** Throws StorageError "not_found" if there is no such job */
  deleteJob(id: string): Promise<void>;

  /** Newest first is up to the caller; a damaged one is listed with `isCorrupt` */
  listApplications(): Promise<ApplicationSummary[]>;
  loadApplication(id: string): Promise<Application>;

  /** The PDF of the CV that was sent. Throws "not_found" if there is none. */
  loadApplicationPdf(id: string): Promise<Uint8Array>;

  /** `pdf` is given when an application is created and left out when it is only edited */
  saveApplication(application: Application, pdf?: Uint8Array): Promise<void>;

  /** Throws StorageError "not_found" if there is no such application */
  deleteApplication(id: string): Promise<void>;

  /** Jobs parked to apply for later. A damaged file is skipped in the list. */
  listCandidates(): Promise<Candidate[]>;
  loadCandidate(id: string): Promise<Candidate>;
  saveCandidate(candidate: Candidate): Promise<void>;
  /** Throws StorageError "not_found" if there is no such candidate */
  deleteCandidate(id: string): Promise<void>;
}
