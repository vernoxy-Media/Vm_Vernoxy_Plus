/**
 * Country > State > City choices for the company form, from Master Data (Settings > Cities / States / Countries).
 * A state belongs to a country and a city belongs to a state. An item nobody linked yet is offered under every parent,
 * so a list the Admin has not finished linking never leaves a user with an empty dropdown.
 */

export interface LocationMasters {
  countries?: string[];
  states?: string[];
  cities?: string[];
  /** State name -> its country. */
  state_country_map?: Record<string, string>;
  /** City name -> its state. */
  city_state_map?: Record<string, string>;
}

const withCurrent = (options: string[], current?: string | null): string[] => {
  const value = (current ?? '').trim();
  // A value saved before the lists were linked stays selectable, so editing a company never wipes it
  return value && !options.includes(value) ? [value, ...options] : options;
};

/** The states to offer for a country: its own states, then the ones not linked to any country. */
export function statesFor(masters: LocationMasters, country?: string | null, current?: string | null): string[] {
  const all = masters.states ?? [];
  const map = masters.state_country_map ?? {};
  const chosen = (country ?? '').trim();
  const own = chosen ? all.filter((s) => map[s] === chosen || map[s] === undefined) : all;
  return withCurrent(own, current);
}

/** The cities to offer for a state: its own cities, then the ones not linked to any state. */
export function citiesFor(masters: LocationMasters, state?: string | null, current?: string | null): string[] {
  const all = masters.cities ?? [];
  const map = masters.city_state_map ?? {};
  const chosen = (state ?? '').trim();
  const own = chosen ? all.filter((c) => map[c] === chosen || map[c] === undefined) : all;
  return withCurrent(own, current);
}

/** The state a city is linked to, so picking a city can fill its state in. */
export const stateOfCity = (masters: LocationMasters, city?: string | null): string | null => masters.city_state_map?.[(city ?? '').trim()] ?? null;

/** The country a state is linked to. */
export const countryOfState = (masters: LocationMasters, state?: string | null): string | null => masters.state_country_map?.[(state ?? '').trim()] ?? null;
