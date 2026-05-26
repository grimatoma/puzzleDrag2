import { describe, it, expect } from 'vitest';
import { locBuilt } from '../locBuilt';

describe('locBuilt', () => {
  it('returns empty object if no built state is provided', () => {
    expect(locBuilt({})).toEqual({});
  });

  it('uses home as default location', () => {
    expect(locBuilt({ built: { home: { hearth: true } } })).toEqual({ hearth: true });
  });

  it('uses mapCurrent as location if provided', () => {
    expect(locBuilt({ mapCurrent: 'meadow', built: { meadow: { farm: true } } })).toEqual({ farm: true });
  });

  it('handles missing location in built state', () => {
    expect(locBuilt({ mapCurrent: 'meadow', built: { home: { hearth: true } } })).toEqual({});
  });

  it('merges flat format built values with location values', () => {
    expect(
      locBuilt({
        built: {
          bakery: true,
          home: { hearth: true },
        },
      })
    ).toEqual({ bakery: true, hearth: true });
  });

  it('handles flat format exclusively', () => {
    expect(locBuilt({ built: { bakery: true, well: true } })).toEqual({ bakery: true, well: true });
  });

  it('handles non-string mapCurrent by defaulting to home', () => {
    expect(
      locBuilt({
        mapCurrent: 123,
        built: { home: { hearth: true } },
      })
    ).toEqual({ hearth: true });
  });

  it('handles null values in flat format correctly', () => {
    expect(
      locBuilt({
        built: {
          bakery: null,
          home: { hearth: true },
        },
      })
    ).toEqual({ bakery: null, hearth: true });
  });
});
