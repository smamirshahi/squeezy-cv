import { useMemo, useState, type ReactNode } from "react";
import { Autocomplete, TextField } from "@components/ui";
import {
  parseCities,
  searchCities,
  type City,
} from "@shared/vault/city-search";

/** The list is downloaded once, the first time a location field is used */
let citiesPromise: Promise<City[]> | null = null;
function loadCities(): Promise<City[]> {
  citiesPromise ??= fetch("/cities.txt")
    .then((response) => (response.ok ? response.text() : ""))
    .then(parseCities)
    .catch(() => []);
  return citiesPromise;
}

interface LocationAutocompleteProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  startAdornment?: ReactNode;
}

/** A text field that suggests "City, Country" while typing; any text can still be typed */
export function LocationAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  startAdornment,
}: LocationAutocompleteProps): JSX.Element {
  const [cities, setCities] = useState<City[]>([]);
  const options = useMemo(() => searchCities(cities, value), [cities, value]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      // The text is the value: suggestions only fill it in
      inputValue={value}
      onInputChange={(_event, text) => onChange(text)}
      filterOptions={(all) => all}
      onFocus={() => {
        void loadCities().then(setCities);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps?.input,
              startAdornment: startAdornment ?? undefined,
            },
          }}
          sx={{ minWidth: 0, width: "100%" }}
        />
      )}
    />
  );
}
