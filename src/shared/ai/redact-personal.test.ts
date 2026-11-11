import { describe, expect, it } from "vitest";
import {
  PersonalData,
  organisationsOf,
  personalOf,
  restore,
  scrub,
  suggestMasks,
  withDetectedMasks,
} from "@shared/ai/redact-personal";
import sample from "@fixtures/sample-cv.json";
import { migrateCvFile } from "@shared/vault/migrate-vault";

const person: PersonalData = {
  profile: {
    fullName: "Mohammad Amirshahi",
    email: "mo@example.com",
    phone: "+44 7700 900123",
    location: "12 High Street, London",
    rightToWork: "Eligible to work in the UK",
  },
  links: [
    {
      id: "l1",
      label: "LinkedIn",
      url: "https://www.linkedin.com/in/mo-a",
      tags: [],
    },
    { id: "l2", label: "GitHub", url: "https://github.com/mo-a", tags: [] },
  ],
};

function roundTrip(text: string, data = person): string {
  const { text: scrubbed, map } = scrub(text, data);
  return restore(scrubbed, map).text;
}

describe("scrub", () => {
  it("replaces every detail and nothing of it remains", () => {
    const text =
      "Mohammad Amirshahi, mo@example.com, 07700 900123, 12 High Street, London. " +
      "Eligible to work in the UK. linkedin.com/in/mo-a and https://github.com/mo-a/";
    const { text: out } = scrub(text, person);
    expect(out).toBe(
      "[Candidate Name], [Email], [Phone Number], [Address]. [Right To Work]. [Link 1] and [Link 2]"
    );
    expect(roundTrip(text)).toContain("mo@example.com");
  });

  it.each([
    "+44 7700 900123",
    "+447700900123",
    "07700 900123",
    "07700900123",
    "+44 (0)7700 900 123",
    "0044 7700-900-123",
    "07700.900.123",
  ])("finds the phone number written as %s", (phone) => {
    const { text } = scrub(`Call ${phone} now`, person);
    expect(text).toBe("Call [Phone Number] now");
  });

  it("finds the name in a job advert, any case, and its parts", () => {
    const { text } = scrub(
      "Dear mohammad, thanks. AMIRSHAHI is great. Mohammad Amirshahi applies.",
      person
    );
    expect(text).toBe(
      "Dear [First Name], thanks. [Last Name] is great. [Candidate Name] applies."
    );
  });

  it("does not replace a name inside a longer word", () => {
    expect(scrub("Mohammadan Amirshahis", person).text).toBe(
      "Mohammadan Amirshahis"
    );
  });

  it("handles repeated values", () => {
    const { text } = scrub("mo@example.com and mo@example.com", person);
    expect(text).toBe("[Email] and [Email]");
  });

  it("replaces the email as a whole although it contains a name part", () => {
    const data = {
      ...person,
      profile: { ...person.profile, email: "mohammad@example.com" },
    };
    expect(scrub("Mail mohammad@example.com", data).text).toBe("Mail [Email]");
  });

  it("does nothing for an empty profile", () => {
    const data: PersonalData = { profile: { fullName: "" }, links: [] };
    const result = scrub("Some text, 07700 900123", data);
    expect(result.text).toBe("Some text, 07700 900123");
    expect(result.map).toEqual({});
  });

  it("round-trips ordinary text unchanged", () => {
    const text = "Dear Mohammad, I am Mohammad Amirshahi (mo@example.com).";
    expect(roundTrip(text)).toBe(text);
  });
});

describe("restore", () => {
  const { map } = scrub("", person);

  it("accepts altered case and spacing inside the brackets", () => {
    expect(restore("Hi [candidate  name] / [ EMAIL ]", map).text).toBe(
      "Hi Mohammad Amirshahi / mo@example.com"
    );
  });

  it("escapes values when asked, for use inside a JSON string", () => {
    const quoted = { "[Address]": 'Flat "A"\\2' };
    expect(restore('{"a":"[Address]"}', quoted, { isForJson: true }).text).toBe(
      '{"a":"Flat \\"A\\"\\\\2"}'
    );
  });

  it("reports placeholders it cannot resolve and leaves them", () => {
    const result = restore("Call [Phone Number], mail [Email address]", {});
    expect(result.text).toBe("Call [Phone Number], mail [Email address]");
    expect(result.unresolved).toEqual(["[Phone Number]", "[Email address]"]);
  });

  it("does not report ordinary brackets", () => {
    expect(restore("see [1] and [WCAG]", map).unresolved).toEqual([]);
  });
});

describe("masking employers and schools (#133)", () => {
  const withOrgs: PersonalData = {
    ...person,
    organisations: {
      companies: ["Example Ltd", "Example Labs"],
      schools: ["University of Example"],
    },
  };

  it("is off unless the organisations are given", () => {
    const { text } = scrub("I worked at Example Ltd.", person);
    expect(text).toBe("I worked at Example Ltd.");
  });

  it("replaces each name with its own numbered placeholder, in any case", () => {
    const { text } = scrub(
      "Built things at EXAMPLE LTD, then example labs. Studied at the University of Example.",
      withOrgs
    );
    expect(text).toBe(
      "Built things at [Company 1], then [Company 2]. Studied at the [Institution 1]."
    );
  });

  it("also finds a name without its Ltd or Inc ending, longest names first", () => {
    const { text } = scrub("Joined Example, left Example Labs.", withOrgs);
    expect(text).toBe("Joined [Company 1], left [Company 2].");
  });

  it("does not replace inside a longer word", () => {
    expect(scrub("Counterexample Ltdx", withOrgs).text).toBe(
      "Counterexample Ltdx"
    );
  });

  it("round-trips: restore puts the full names back", () => {
    const { text, map } = scrub(
      "Worked at Example Ltd and studied at University of Example",
      withOrgs
    );
    expect(restore(text, map).text).toBe(
      "Worked at Example Ltd and studied at University of Example"
    );
  });

  it("reports a company placeholder the model invented or mangled", () => {
    const { map } = scrub("", withOrgs);
    const { text, unresolved } = restore(
      "Led [Company 1] and [Company 9], taught at [institution 1]",
      map
    );
    expect(text).toBe(
      "Led Example Ltd and [Company 9], taught at University of Example"
    );
    expect(unresolved).toEqual(["[Company 9]"]);
  });

  it("takes employers from experience and schools from education, once each", () => {
    const { vault } = migrateCvFile(sample);
    const found = organisationsOf(vault.sections);
    expect(found.companies).toEqual([
      "Example Ltd",
      "Sample Systems",
      "Demo Co",
    ]);
    expect(found.schools).toEqual(["University of Example"]);
    expect(personalOf(vault, false).organisations).toBeUndefined();
    expect(personalOf(vault, true).organisations).toEqual(found);
  });
});

describe("automatic masks for what the text contains", () => {
  const text =
    "See https://acme.example/careers and https://other.example/team. " +
    "Write to hr@acme.example or call +44 20 7946 0958. Worked 2018 - 2021, from 2026-03-01.";

  it("hides links, emails and phone numbers the profile does not list", () => {
    const data = withDetectedMasks(text, person);
    const { text: masked, map } = scrub(text, data);
    expect(masked).not.toContain("acme.example");
    expect(masked).not.toContain("other.example");
    expect(masked).not.toContain("hr@");
    expect(masked).not.toContain("7946");
    // links continue after the profile's two links
    expect(masked).toContain("[Link 3]");
    expect(masked).toContain("[Link 4]");
    expect(masked).toContain("[Email 1]");
    expect(masked).toContain("[Phone 1]");
    expect(restore(masked, map).text).toBe(text);
  });

  it("never takes a date or a year range for a phone number", () => {
    const data = withDetectedMasks(text, person);
    const { text: masked } = scrub(text, data);
    expect(masked).toContain("2018 - 2021");
    expect(masked).toContain("2026-03-01");
    expect(suggestMasks("Worked 2018 - 2021", person)).toEqual([]);
  });

  it("leaves a value alone when the user switched it off", () => {
    const data = withDetectedMasks(text, {
      ...person,
      masking: { custom: [], skip: ["hr@acme.example"] },
    });
    const { text: masked } = scrub(text, data);
    expect(masked).toContain("hr@acme.example");
    expect(masked).not.toContain("acme.example/careers");
  });

  it("does nothing when there is no CV owner, so an import keeps its contact details", () => {
    const none: PersonalData = { profile: { fullName: "" }, links: [] };
    expect(withDetectedMasks(text, none)).toBe(none);
  });

  it("names schools, universities and colleges [Institution n]", () => {
    const data: PersonalData = {
      ...person,
      organisations: { companies: [], schools: ["University of Example"] },
    };
    expect(scrub("Studied at University of Example", data).text).toBe(
      "Studied at [Institution 1]"
    );
  });
});
