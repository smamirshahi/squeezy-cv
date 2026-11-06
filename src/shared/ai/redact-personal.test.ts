import { describe, expect, it } from "vitest";
import { PersonalData, restore, scrub } from "@shared/ai/redact-personal";

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
