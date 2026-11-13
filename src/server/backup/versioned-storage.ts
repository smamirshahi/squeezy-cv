import { Candidate } from "@custom-types/candidate-types";
import {
  Application,
  ApplicationSummary,
} from "@custom-types/application-types";
import { CvFile } from "@custom-types/vault-types";
import { Job } from "@custom-types/job-types";
import { Template } from "@custom-types/template-types";
import { BackupService } from "@server/backup/backup-service";
import {
  CvStorage,
  JobSummary,
  TemplateSummary,
} from "@shared/storage/cv-storage";

/** Wraps a storage and commits the data folder after every successful change */
export class VersionedCvStorage implements CvStorage {
  constructor(
    private readonly inner: CvStorage,
    private readonly backup: BackupService
  ) {}

  loadVault(): Promise<CvFile> {
    return this.inner.loadVault();
  }

  async saveVault(file: CvFile): Promise<void> {
    await this.inner.saveVault(file);
    await this.backup.commit("Save: vault");
  }

  listTemplates(): Promise<TemplateSummary[]> {
    return this.inner.listTemplates();
  }

  loadTemplate(id: string): Promise<Template> {
    return this.inner.loadTemplate(id);
  }

  async saveTemplate(template: Template): Promise<void> {
    await this.inner.saveTemplate(template);
    await this.backup.commit(`Save: template ${template.id}`);
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.inner.deleteTemplate(id);
    await this.backup.commit(`Delete: template ${id}`);
  }

  listJobs(): Promise<JobSummary[]> {
    return this.inner.listJobs();
  }

  loadJob(id: string): Promise<Job> {
    return this.inner.loadJob(id);
  }

  async saveJob(job: Job): Promise<void> {
    await this.inner.saveJob(job);
    await this.backup.commit(`Save: job ${job.id}`);
  }

  async deleteJob(id: string): Promise<void> {
    await this.inner.deleteJob(id);
    await this.backup.commit(`Delete: job ${id}`);
  }

  listApplications(): Promise<ApplicationSummary[]> {
    return this.inner.listApplications();
  }

  loadApplication(id: string): Promise<Application> {
    return this.inner.loadApplication(id);
  }

  loadApplicationPdf(id: string): Promise<Uint8Array> {
    return this.inner.loadApplicationPdf(id);
  }

  async saveApplication(
    application: Application,
    pdf?: Uint8Array
  ): Promise<void> {
    await this.inner.saveApplication(application, pdf);
    await this.backup.commit(
      pdf
        ? `Apply: ${application.company}, ${application.role} (${application.id})`
        : `Update application ${application.id}`
    );
  }

  async deleteApplication(id: string): Promise<void> {
    await this.inner.deleteApplication(id);
    await this.backup.commit(`Delete: application ${id}`);
  }

  listCandidates(): Promise<Candidate[]> {
    return this.inner.listCandidates();
  }

  loadCandidate(id: string): Promise<Candidate> {
    return this.inner.loadCandidate(id);
  }

  async saveCandidate(candidate: Candidate): Promise<void> {
    await this.inner.saveCandidate(candidate);
    await this.backup.commit(`Save: candidate ${candidate.id}`);
  }

  async deleteCandidate(id: string): Promise<void> {
    await this.inner.deleteCandidate(id);
    await this.backup.commit(`Delete: candidate ${id}`);
  }
}
