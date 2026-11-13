import { composeOsmAddress, ReverseGeocoder } from './reverse-geocoder';

describe('composeOsmAddress', () => {
  it('reads house, road, area, city, state and pin code in order', () => {
    expect(
      composeOsmAddress({ house_number: '12', road: 'Stadium Road', suburb: 'Tithal', city: 'Valsad', state: 'Gujarat', postcode: '396001' }),
    ).toBe('12 Stadium Road, Tithal, Valsad, Gujarat, 396001');
  });

  it('leaves out repeats and missing parts', () => {
    expect(composeOsmAddress({ suburb: 'Valsad', city: 'Valsad', state: 'Gujarat' })).toBe('Valsad, Gujarat');
    expect(composeOsmAddress({})).toBeNull();
    expect(composeOsmAddress(undefined)).toBeNull();
  });
});

describe('ReverseGeocoder', () => {
  const realFetch = global.fetch;
  const key = process.env.GOOGLE_MAPS_API_KEY;
  afterEach(() => {
    global.fetch = realFetch;
    if (key === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
    else process.env.GOOGLE_MAPS_API_KEY = key;
  });

  const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as Response;

  it('uses Google when a key is set, and skips a bare plus code', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: string | URL | Request) => {
      calls.push(String(url));
      return json({
        status: 'OK',
        results: [
          { formatted_address: '5G9Q+2X Valsad, Gujarat', types: ['plus_code'] },
          { formatted_address: 'Stadium Rd, Tithal, Valsad, Gujarat 396001, India', types: ['route'] },
        ],
      });
    }) as unknown as typeof fetch;

    const r = await new ReverseGeocoder().lookup(20.5992, 72.9342);
    expect(r).toEqual({ address: 'Stadium Rd, Tithal, Valsad, Gujarat 396001, India', source: 'google' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('maps.googleapis.com');
  });

  it('falls back to OpenStreetMap when there is no key, and remembers the answer', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const fetchMock = jest.fn(async () => json({ display_name: 'Valsad, India', address: { road: 'Stadium Road', city: 'Valsad', state: 'Gujarat' } }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const geocoder = new ReverseGeocoder();
    const a = await geocoder.lookup(20.1, 72.1);
    const b = await geocoder.lookup(20.1, 72.1);
    expect(a).toEqual({ address: 'Stadium Road, Valsad, Gujarat', source: 'osm' });
    expect(b).toEqual(a);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to OpenStreetMap when Google refuses, without throwing', async () => {
    process.env.GOOGLE_MAPS_API_KEY = 'bad-key';
    global.fetch = jest.fn(async (url: string | URL | Request) =>
      String(url).includes('googleapis') ? json({ status: 'REQUEST_DENIED', error_message: 'API key invalid' }) : json({ display_name: 'Somewhere, India' }),
    ) as unknown as typeof fetch;

    const r = await new ReverseGeocoder().lookup(21, 73);
    expect(r).toEqual({ address: 'Somewhere, India', source: 'osm' });
  });

  it('gives no address (and does not throw) when everything fails', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    global.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await new ReverseGeocoder().lookup(22, 74)).toEqual({ address: null, source: 'none' });
  });
});
