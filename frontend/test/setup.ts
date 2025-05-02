import '@testing-library/jest-dom';
import * as mapboxgl from 'mapbox-gl';

globalThis.IntersectionObserver = class IntersectionObserver {
    constructor(callback: any) {
        this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
};

vi.mock('mapbox-gl', () => ({
  __esModule: true,
  default: {
    Map: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      off: vi.fn(),
      remove: vi.fn(),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
    })),
    Marker: vi.fn().mockImplementation(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn(),
      remove: vi.fn(),
    })),
    accessToken: '',
  }
}));

