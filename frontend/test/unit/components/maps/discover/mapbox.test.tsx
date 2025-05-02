import { render } from '@testing-library/react';
import Mapbox from '../../../../../src/components/maps/discover/Mapbox';
import mapboxgl from 'mapbox-gl';
import { vi } from 'vitest'; // ✅ Import vi for mocking

// Mock mapbox-gl using Vitest
vi.mock('mapbox-gl', () => {
  return {
    default: {
      Map: vi.fn(() => ({
        on: vi.fn(),
        remove: vi.fn()
      })),
      accessToken: ''
    }
  };
});

describe('Mapbox component', () => {
  it('renders map container and initializes map', () => {
    const { container } = render(<Mapbox />);

    const mapDiv = container.querySelector('.map-container');
    expect(mapDiv).toBeInTheDocument();

    expect(mapboxgl.Map).toHaveBeenCalled();
  });
});
