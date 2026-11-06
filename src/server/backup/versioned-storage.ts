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
}
