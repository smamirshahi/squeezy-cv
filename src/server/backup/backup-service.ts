import { BackupStatus, DataRepo } from "@server/backup/data-repo";

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Commits the data folder after saves and pushes on request. A git problem is remembered
 * and reported, but never stops a save: the data on disk is what matters.
 */
export class BackupService {
  private lastError: string | undefined;

  /** Commits run one after another */
  private tail: Promise<unknown> = Promise.resolve();

  constructor(private readonly repo: DataRepo) {}

  get isEnabled(): boolean {
    return this.repo.isEnabled();
  }

  /** Never throws */
  commit(message: string): Promise<void> {
    if (!this.repo.isEnabled()) {
      return Promise.resolve();
    }
    const result = this.tail.then(async () => {
      try {
        await this.repo.commit(message);
        this.lastError = undefined;
      } catch (error) {
        this.lastError = `Could not commit: ${describe(error)}`;
      }
    });
    this.tail = result;
    return result;
  }

  /** Throws with a readable message if the push fails */
  async push(): Promise<BackupStatus> {
    await this.tail;
    try {
      await this.repo.push();
      this.lastError = undefined;
    } catch (error) {
      this.lastError = `Could not push: ${describe(error)}`;
      throw new Error(this.lastError);
    }
    return this.status();
  }

  async status(): Promise<BackupStatus> {
    if (!this.repo.isEnabled()) {
      return { isEnabled: false, hasRemote: false, unpushedCommits: 0 };
    }
    await this.tail;
    return {
      isEnabled: true,
      hasRemote: await this.repo.hasRemote(),
      unpushedCommits: await this.repo.countUnpushed(),
      ...(this.lastError ? { lastError: this.lastError } : {}),
    };
  }
}
