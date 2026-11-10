// Builds public/cities.txt (city suggestions for the Location fields) from GeoNames.
// Usage: node scripts/build-cities.mjs <cities5000.txt> <countryInfo.txt>
// Data: https://download.geonames.org/export/dump/ (cities5000.zip, countryInfo.txt), CC BY 4.0.
// Output: one line per city, most populous first: "City<TAB>Country<TAB>alt1,alt2,..."
// where the alternatives are plain-letter spellings used for matching only: the unaccented name
// (Koeln for Köln) for every city, and for the big ones (EXONYM_MIN_POPULATION) also other names
// such as Cologne. All-capital entries (airport codes) are left out.
import { readFileSync, writeFileSync } from "node:fs";

const [citiesFile, countriesFile] = process.argv.slice(2);
if (!citiesFile || !countriesFile) {
  throw new Error(
    "Usage: node scripts/build-cities.mjs <cities5000.txt> <countryInfo.txt>"
  );
}

const countries = new Map();
for (const line of readFileSync(countriesFile, "utf8").split("\n")) {
  if (line && !line.startsWith("#")) {
    const cols = line.split("\t");
    countries.set(cols[0], cols[4]);
  }
}

const MAX_ALTERNATIVES = 6;
const EXONYM_MIN_POPULATION = 500000;
const plain = /^[A-Za-z][A-Za-z .'-]*$/;
const rows = [];
for (const line of readFileSync(citiesFile, "utf8").split("\n")) {
  if (!line) continue;
  const cols = line.split("\t");
  const [
    ,
    name,
    asciiName,
    alternates,
    ,
    ,
    ,
    featureCode,
    countryCode,
    ,
    ,
    ,
    ,
    ,
    population,
  ] = cols;
  // PPLX = a district of a city (Zürich (Kreis 3), Paris 15 Vaugirard): the city itself is enough
  if (featureCode === "PPLX") continue;
  const country = countries.get(countryCode);
  if (!country) continue;
  const seen = new Set([name.toLowerCase()]);
  const alternatives = [];
  const isBig = Number(population) >= EXONYM_MIN_POPULATION;
  for (const candidate of [
    asciiName,
    ...(isBig ? alternates.split(",") : []),
  ]) {
    const key = candidate.toLowerCase();
    if (
      plain.test(candidate) &&
      candidate !== candidate.toUpperCase() &&
      candidate.length > 3 &&
      !seen.has(key) &&
      alternatives.length < MAX_ALTERNATIVES
    ) {
      seen.add(key);
      alternatives.push(candidate);
    }
  }
  rows.push({
    population: Number(population),
    text: `${name}\t${country}\t${alternatives.join(",")}`,
  });
}
rows.sort((a, b) => b.population - a.population);
writeFileSync(
  "public/cities.txt",
  rows.map((row) => row.text).join("\n") + "\n"
);
console.log(`${rows.length} cities written`);
