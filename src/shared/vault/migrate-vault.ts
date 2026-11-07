import { nanoid } from "nanoid";
import { Array, Boolean, Object, String, Union, Static } from "runtypes";
import { MetaDataSchema } from "@custom-types/json-types";
import { SkillItemSchema } from "@custom-types/skill-types";
import { StyleSchema } from "@custom-types/styles-types";
import {
  Bullet,
  CURRENT_VAULT_VERSION,
  CvFile,
  CvFileSchema,
  Item,
  LinkItem,
  Section,
} from "@custom-types/vault-types";

/**
 * Lenient shape of every CV file written before the vault existed. It accepts both the
 * current legacy format and older exports (bullets as {id, text} objects, missing
 * `shouldShow`, missing `bulletPointIcon`).
 */
const LegacyBulletSchema = Union(String, Object({ id: String, text: String }));

const LegacyFileSchema = Object({
  metaData: MetaDataSchema,
  data: Object({
    personalInfo: Object({ name: String, jobTitle: String }),
    contactInfo: Object({
      email: String,
      phone: String,
      location: String,
      linkedInId: String,
      gitHubId: String,
    }),
    professionalSummary: String,
    experiences: Array(
      Object({
        id: String,
        jobTitle: String,
        company: String,
        location: String,
        startDate: String,
        endDate: String.optional(),
        bulletPoints: Array(LegacyBulletSchema),
        shouldShow: Boolean.optional(),
      })
    ),
    educations: Array(
      Object({
        id: String,
        degree: String,
        institute: String,
        location: String,
        startDate: String,
        endDate: String.optional(),
        dissertationTitle: String.optional(),
        shouldShow: Boolean.optional(),
      })
    ),
    skills: Array(
      Object({
        id: String,
        category: String,
        items: Array(SkillItemSchema),
        shouldShow: Boolean.optional(),
      })
    ),
  }),
  style: Object({}),
});

type LegacyFile = Static<typeof LegacyFileSchema>;

/** Creates ids. Injectable so tests can be deterministic. */
export type IdGenerator = () => string;

/** One step that turns vault version N into version N+1 (raw JSON in, raw JSON out) */
export type VaultMigration = (raw: Record<string, unknown>) => unknown;

/** Key N migrates the vault from version N to N+1. Empty while version 1 is current. */
const VAULT_MIGRATIONS: Record<number, VaultMigration> = {};

const LINKEDIN_BASE_URL = "https://www.linkedin.com/in/";
const GITHUB_BASE_URL = "https://github.com/";

function toUrl(idOrUrl: string, baseUrl: string): string {
  return /^https?:\/\//i.test(idOrUrl) ? idOrUrl : `${baseUrl}${idOrUrl}`;
}

function definedFields(
  fields: Record<string, string | undefined>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of globalThis.Object.entries(fields)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !globalThis.Array.isArray(value)
  );
}

/** Converts a pre-vault CV file into the current vault file */
export function migrateLegacyFile(
  raw: unknown,
  newId: IdGenerator = nanoid
): CvFile {
  const legacy: LegacyFile = LegacyFileSchema.check(raw);
  const { data } = legacy;

  function toBullet(b: string | { id: string; text: string }): Bullet {
    return typeof b === "string"
      ? { id: newId(), text: b, tags: [] }
      : { id: b.id, text: b.text, tags: [] };
  }

  const links: LinkItem[] = [];
  if (data.contactInfo.linkedInId) {
    links.push({
      id: newId(),
      label: "LinkedIn",
      url: toUrl(data.contactInfo.linkedInId, LINKEDIN_BASE_URL),
      tags: [],
    });
  }
  if (data.contactInfo.gitHubId) {
    links.push({
      id: newId(),
      label: "GitHub",
      url: toUrl(data.contactInfo.gitHubId, GITHUB_BASE_URL),
      tags: [],
    });
  }

  const summaryItems: Item[] = data.professionalSummary
    ? [
        {
          id: newId(),
          fields: { text: data.professionalSummary },
          bullets: [],
          tags: [],
          shouldShow: true,
        },
      ]
    : [];

  const sections: Section[] = [
    {
      id: "summary",
      type: "summary",
      title: "Professional Summary",
      items: summaryItems,
    },
    {
      id: "experience",
      type: "experience",
      title: "Work Experience",
      items: data.experiences.map((e) => ({
        id: e.id,
        fields: definedFields({
          jobTitle: e.jobTitle,
          company: e.company,
          location: e.location,
          startDate: e.startDate,
          endDate: e.endDate,
        }),
        bullets: e.bulletPoints.map(toBullet),
        tags: [],
        shouldShow: e.shouldShow ?? true,
      })),
    },
    {
      id: "education",
      type: "education",
      title: "Education",
      items: data.educations.map((e) => ({
        id: e.id,
        fields: definedFields({
          degree: e.degree,
          institute: e.institute,
          location: e.location,
          startDate: e.startDate,
          endDate: e.endDate,
          dissertationTitle: e.dissertationTitle,
        }),
        bullets: [],
        tags: [],
        shouldShow: e.shouldShow ?? true,
      })),
    },
    {
      id: "skills",
      type: "skills",
      title: "Skills",
      items: data.skills.map((s) => ({
        id: s.id,
        fields: { category: s.category },
        bullets: s.items.map((i) => ({
          id: i.id,
          text: i.name,
          tags: [],
          rating: i.rating,
        })),
        tags: [],
        shouldShow: s.shouldShow ?? true,
      })),
    },
  ];

  const style = StyleSchema.check({
    bulletPointIcon: "disc",
    ...(isRecord(raw) && isRecord(raw.style) ? raw.style : {}),
  });

  return {
    metaData: legacy.metaData,
    vault: {
      version: CURRENT_VAULT_VERSION,
      profile: {
        fullName: data.personalInfo.name,
        headline: data.personalInfo.jobTitle || undefined,
        email: data.contactInfo.email || undefined,
        phone: data.contactInfo.phone || undefined,
        location: data.contactInfo.location || undefined,
      },
      links,
      sections,
    },
    style,
  };
}

/**
 * Reads any supported CV file (legacy or any vault version) and returns the current
 * format. Throws a descriptive error for files it cannot read, including files written
 * by a newer version of the app.
 */
export function migrateCvFile(
  raw: unknown,
  options: {
    newId?: IdGenerator;
    migrations?: Record<number, VaultMigration>;
    currentVersion?: number;
  } = {}
): CvFile {
  const {
    newId = nanoid,
    migrations = VAULT_MIGRATIONS,
    currentVersion = CURRENT_VAULT_VERSION,
  } = options;

  if (!isRecord(raw)) {
    throw new Error("CV file must be a JSON object.");
  }

  if (!("vault" in raw)) {
    return migrateLegacyFile(raw, newId);
  }

  const vault = raw.vault;
  const version = isRecord(vault) ? vault.version : undefined;
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    throw new Error("CV file has no valid vault version.");
  }
  if (version > currentVersion) {
    throw new Error(
      `CV file is version ${version}, but this app only supports up to ${currentVersion}. Update the app.`
    );
  }

  let current: Record<string, unknown> = raw;
  for (let v = version; v < currentVersion; v++) {
    const step = migrations[v];
    if (!step) {
      throw new Error(`No migration from vault version ${v} to ${v + 1}.`);
    }
    const next = step(current);
    if (!isRecord(next)) {
      throw new Error(`Migration ${v} to ${v + 1} did not return an object.`);
    }
    current = next;
  }

  return CvFileSchema.check(current);
}
