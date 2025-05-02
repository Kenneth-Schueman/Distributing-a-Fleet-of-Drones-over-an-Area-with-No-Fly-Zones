import { render } from '@testing-library/react';
import { describe, it, vi, expect } from 'vitest';
import Mapbox from '../../../../../src/components/maps/operate/Mapbox';

vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(),
      remove: vi.fn(),
    })),
    accessToken: '',
  },
}));

describe('Mapbox component', () => {
  it('renders the map container and initializes Mapbox', async () => {
    const { container } = render(<Mapbox />);
    const mapDiv = container.querySelector('.map-container');

    expect(mapDiv).toBeInTheDocument();

    expect((await import('mapbox-gl')).default.Map).toHaveBeenCalled();
  });
});
