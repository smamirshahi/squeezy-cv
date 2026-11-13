import { FeedbackIssue } from "@shared/feedback/feedback-issue";

interface CreatedIssue {
  number: number;
  url: string;
}

/** Creates the issue for a report. Fakeable in tests. */
export interface FeedbackSender {
  create(issue: FeedbackIssue): Promise<CreatedIssue>;
}

export class FeedbackSendError extends Error {}

/** Creates issues through the GitHub API. The token stays on the server, never in the browser. */
export class GithubFeedbackSender implements FeedbackSender {
  constructor(
    private readonly repo: string,
    private readonly token: string,
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  async create(issue: FeedbackIssue): Promise<CreatedIssue> {
    let response: Response;
    try {
      response = await this.fetchFn(
        `https://api.github.com/repos/${this.repo}/issues`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "cv-builder",
          },
          body: JSON.stringify(issue),
        }
      );
    } catch {
      throw new FeedbackSendError("GitHub could not be reached.");
    }
    if (!response.ok) {
      throw new FeedbackSendError(
        `GitHub did not accept the report (${response.status}).`
      );
    }
    const created = (await response.json()) as {
      number: number;
      html_url: string;
    };
    return { number: created.number, url: created.html_url };
  }
}

/** The sender from the environment, or none when no token is set (then the page offers the GitHub link) */
export function readFeedbackSender(
  env: Record<string, string | undefined>,
  repo: string
): FeedbackSender | undefined {
  const token = env.FEEDBACK_GITHUB_TOKEN?.trim();
  return token ? new GithubFeedbackSender(repo, token) : undefined;
}
