import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { citiesFor, countryOfState, stateOfCity, statesFor } from './location-options';

const masters = {
  countries: ['India', 'USA'],
  states: ['Gujarat', 'Texas', 'Goa'],
  cities: ['Ahmedabad', 'Surat', 'Austin', 'Panaji'],
  state_country_map: { Gujarat: 'India', Texas: 'USA' },
  city_state_map: { Ahmedabad: 'Gujarat', Surat: 'Gujarat', Austin: 'Texas' },
};

describe('location-options', () => {
  it('offers only the states of the chosen country, plus the states nobody linked yet', () => {
    assert.deepEqual(statesFor(masters, 'India'), ['Gujarat', 'Goa']);
    assert.deepEqual(statesFor(masters, 'USA'), ['Texas', 'Goa']);
  });

  it('offers every state while no country is chosen', () => {
    assert.deepEqual(statesFor(masters, ''), ['Gujarat', 'Texas', 'Goa']);
  });

  it('offers only the cities of the chosen state, plus the cities nobody linked yet', () => {
    assert.deepEqual(citiesFor(masters, 'Gujarat'), ['Ahmedabad', 'Surat', 'Panaji']);
    assert.deepEqual(citiesFor(masters, 'Texas'), ['Austin', 'Panaji']);
  });

  it('keeps a value saved earlier selectable even when it is no longer in the list', () => {
    assert.deepEqual(citiesFor(masters, 'Gujarat', 'Baroda')[0], 'Baroda');
    assert.deepEqual(statesFor(masters, 'India', 'Kerala')[0], 'Kerala');
  });

  it('finds the parent of a city and of a state', () => {
    assert.equal(stateOfCity(masters, 'Surat'), 'Gujarat');
    assert.equal(stateOfCity(masters, 'Panaji'), null);
    assert.equal(countryOfState(masters, 'Texas'), 'USA');
  });
});
