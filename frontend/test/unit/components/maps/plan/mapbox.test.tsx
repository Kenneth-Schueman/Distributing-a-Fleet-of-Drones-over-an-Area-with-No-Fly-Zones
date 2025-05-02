import { describe, it, vi, expect } from 'vitest';
import { render } from '@testing-library/react';
import Mapbox from '../../../../../src/components/maps/plan/Mapbox';

vi.mock('mapbox-gl', () => {
  return {
    default: {
      Map: vi.fn(() => ({
        on: vi.fn(),
        remove: vi.fn(),
      })),
      accessToken: '',
    },
  };
});

describe('Mapbox Component', () => {
  it('renders map container and initializes mapbox-gl.Map', async () => {
    const { container } = render(<Mapbox />);
    const mapContainer = container.querySelector('.map-container');

    expect(mapContainer).toBeInTheDocument();

    const mapboxgl = (await import('mapbox-gl')).default;
    expect(mapboxgl.Map).toHaveBeenCalled();
  });
});
