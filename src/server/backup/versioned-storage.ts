import {
  Application,
  ApplicationSummary,
} from "@custom-types/application-types";
import { CvFile } from "@custom-types/vault-types";
import { Variant } from "@custom-types/variant-types";
import { BackupService } from "@server/backup/backup-service";
import { CvStorage, VariantSummary } from "@server/storage/cv-storage";

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

  listVariants(): Promise<VariantSummary[]> {
    return this.inner.listVariants();
  }

  loadVariant(id: string): Promise<Variant> {
    return this.inner.loadVariant(id);
  }

  async saveVariant(variant: Variant): Promise<void> {
    await this.inner.saveVariant(variant);
    await this.backup.commit(`Save: variant ${variant.id}`);
  }

  async deleteVariant(id: string): Promise<void> {
    await this.inner.deleteVariant(id);
    await this.backup.commit(`Delete: variant ${id}`);
  }

  listApplications(): Promise<ApplicationSummary[]> {
    return this.inner.listApplications();
  }

  loadApplication(id: string): Promise<Application> {
    return this.inner.loadApplication(id);
  }

  loadApplicationPdf(id: string): Promise<Buffer> {
    return this.inner.loadApplicationPdf(id);
  }

  async saveApplication(application: Application, pdf?: Buffer): Promise<void> {
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
}
