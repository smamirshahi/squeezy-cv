/** One suggestion source line: a city, its country and spellings used only for matching */
export interface City {
  name: string;
  country: string;
  /** Lower-case, unaccented words to match against (the name and its other spellings) */
  keys: string[];
  /** Lower-case, unaccented country name */
  countryKey: string;
}

const MAX_SUGGESTIONS = 8;

/** Short forms people type for a country, mapped to the start of the full name */
const COUNTRY_ALIASES: Record<string, string> = {
  uk: "united kingdom",
  gb: "united kingdom",
  usa: "united states",
  us: "united states",
  uae: "united arab emirates",
};

/** Lower case without accents ("Zürich" -> "zurich") */
function normalise(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Reads the cities file: lines "City<TAB>Country<TAB>other,spellings", most populous first */
export function parseCities(text: string): City[] {
  const cities: City[] = [];
  for (const line of text.split("\n")) {
    const [name, country, others] = line.split("\t");
    if (name && country) {
      const keys = [name, ...(others ? others.split(",") : [])].map(normalise);
      cities.push({ name, country, keys, countryKey: normalise(country) });
    }
  }
  return cities;
}

/**
 * Suggestions "City, Country" for what the user typed, like "lon" or "leeds, uk".
 * The part before a comma matches the start of a city name (or of a word in it, like
 * "york" for "New York"); the part after it matches the start of the country. Exact
 * spellings come first, then names that start with it, then the file's order (largest first).
 */
export function searchCities(
  cities: City[],
  query: string,
  limit = MAX_SUGGESTIONS
): string[] {
  const [cityPart, ...rest] = query.split(",");
  const cityQuery = normalise(cityPart);
  if (cityQuery.length < 2) {
    return [];
  }
  const countryTyped = normalise(rest.join(","));
  const countryQuery = COUNTRY_ALIASES[countryTyped] ?? countryTyped;
  // 0 = a spelling equals the query, 1 = a spelling starts with it, 2 = a word in it does
  const matches: { city: City; rank: number }[] = [];
  for (const city of cities) {
    if (countryQuery && !city.countryKey.startsWith(countryQuery)) {
      continue;
    }
    let rank = Infinity;
    for (const key of city.keys) {
      if (key === cityQuery) {
        rank = 0;
        break;
      }
      if (key.startsWith(cityQuery)) {
        rank = Math.min(rank, 1);
      } else if (
        key.split(/[\s-]+/).some((word) => word.startsWith(cityQuery))
      ) {
        rank = Math.min(rank, 2);
      }
    }
    if (rank !== Infinity) {
      matches.push({ city, rank });
    }
  }
  matches.sort((a, b) => a.rank - b.rank);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const { city } of matches) {
    const label = `${city.name}, ${city.country}`;
    if (!seen.has(label)) {
      seen.add(label);
      result.push(label);
    }
    if (result.length === limit) {
      break;
    }
  }
  return result;
}
