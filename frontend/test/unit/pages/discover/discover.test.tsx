import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Mapbox from '../../../../src/pages/Discover/Discover.tsx';
import axios from 'axios';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom';

vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Mapbox Component', () => {
  beforeEach(() => {
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { map_id: 1 } });
  });

  test('renders map container', () => {
    render(<Mapbox />);
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toBeInTheDocument();
  });

  test('toggles menu visibility when the button is clicked', () => {
    render(<Mapbox />);
    const toggleButton = screen.getByText(/No-Fly Zones/);
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(screen.getByText('Refresh Map')).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(screen.queryByText('Refresh Map')).not.toBeInTheDocument();
  });

  test('toggles fly zone checkbox states', () => {
    render(<Mapbox />);

    const toggleButton = screen.getByText(/No-Fly Zones/);
    fireEvent.click(toggleButton);

    const iowaNoFlyCheckbox = screen.getByLabelText('Iowa No-Fly Zones');
    expect(iowaNoFlyCheckbox).not.toBeChecked();

    fireEvent.click(iowaNoFlyCheckbox);
    expect(iowaNoFlyCheckbox).toBeChecked();

    fireEvent.click(iowaNoFlyCheckbox);
    expect(iowaNoFlyCheckbox).not.toBeChecked();
  });

  test('refresh no-fly zones when button is clicked', async () => {
    render(<Mapbox />);

    const toggleButton = screen.getByText(/No-Fly Zones/i);
    fireEvent.click(toggleButton);

    const iowaNoFlyCheckbox = screen.getByLabelText('Iowa No-Fly Zones');
    fireEvent.click(iowaNoFlyCheckbox);

    const refreshButton = await screen.findByText(/Refresh Map/i);
    fireEvent.click(refreshButton);
  });

  test('disables "Refresh Map" button when no fly zones are selected', async () => {
    render(<Mapbox />);

    const toggleButton = screen.getByText(/No-Fly Zones/);
    fireEvent.click(toggleButton);

    const refreshButton = screen.getByText(/Refresh Map/);
    expect(refreshButton).toBeDisabled();

    const iowaNoFlyCheckbox = screen.getByLabelText('Iowa No-Fly Zones');
    fireEvent.click(iowaNoFlyCheckbox);

    await waitFor(() => {
        expect(refreshButton).not.toBeDisabled();
    });
  });
});
