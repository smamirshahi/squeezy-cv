// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SponsorshipCheck } from "@pages/workspace/sponsorship-check";

afterEach(cleanup);

describe("SponsorshipCheck", () => {
  it("links to the official register and to the working SponsorLicenseCheck address", () => {
    render(<SponsorshipCheck company="Acme" />);
    fireEvent.click(
      screen.getByRole("button", { name: "Check visa sponsorship" })
    );
    const check = screen.getByRole("link", {
      name: /SponsorLicenseCheck\.co\.uk/,
    });
    // spelled with an s: the "licence" spelling does not resolve
    expect(check.getAttribute("href")).toBe(
      "https://sponsorlicensecheck.co.uk/"
    );
    expect(check.getAttribute("href")).not.toMatch(/licencecheck/);
    expect(
      screen
        .getByRole("link", { name: /Official register of licensed sponsors/ })
        .getAttribute("href")
    ).toBe(
      "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers"
    );
  });
});
