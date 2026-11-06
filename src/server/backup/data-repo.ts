import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

const GIT_TIMEOUT_MS = 60_000;

export interface BackupStatus {
  /** The data folder is its own git repository, so saves are committed */
  isEnabled: boolean;
  hasRemote: boolean;

  /** Commits that are not on the remote yet (all of them if there is no upstream) */
  unpushedCommits: number;

  /** The last git problem, if the most recent commit or push failed */
  lastError?: string;
}

/** Version control for the data folder. Implemented with git; tests can use a fake. */
export interface DataRepo {
  isEnabled(): boolean;

  /** Commits everything that changed. Does nothing if nothing changed. */
  commit(message: string): Promise<void>;
  push(): Promise<void>;
  countUnpushed(): Promise<number>;
  hasRemote(): Promise<boolean>;
}

/**
 * The data folder as a git repository. It only counts when the folder has its own `.git`,
 * never a parent's (the code repo ignores `data/`, so git would otherwise work on that one).
 */
export class GitDataRepo implements DataRepo {
  constructor(private readonly dataDir: string) {}

  isEnabled(): boolean {
    return existsSync(path.join(this.dataDir, ".git"));
  }

  private async git(...args: string[]): Promise<string> {
    const { stdout } = await run("git", args, {
      cwd: this.dataDir,
      timeout: GIT_TIMEOUT_MS,
      // Never wait for a password prompt that nobody can answer
      // eslint-disable-next-line @typescript-eslint/naming-convention -- git environment variable
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    return stdout.trim();
  }

  async commit(message: string): Promise<void> {
    await this.git("add", "--all");
    if ((await this.git("status", "--porcelain")) === "") {
      return;
    }
    await this.git("commit", "--message", message);
  }

  private async remoteName(): Promise<string | undefined> {
    const remotes = await this.git("remote");
    return remotes.split("\n")[0] || undefined;
  }

  async hasRemote(): Promise<boolean> {
    return (await this.remoteName()) !== undefined;
  }

  async push(): Promise<void> {
    const remote = await this.remoteName();
    if (!remote) {
      throw new Error("The data repository has no remote to push to.");
    }
    await this.git("push", "--set-upstream", remote, "HEAD");
  }

  async countUnpushed(): Promise<number> {
    let output: string;
    try {
      output = await this.git("rev-list", "--count", "@{upstream}..HEAD");
    } catch {
      // No upstream yet (or no commits): everything counts as not pushed
      try {
        output = await this.git("rev-list", "--count", "HEAD");
      } catch {
        return 0;
      }
    }
    return Number(output);
  }
}
