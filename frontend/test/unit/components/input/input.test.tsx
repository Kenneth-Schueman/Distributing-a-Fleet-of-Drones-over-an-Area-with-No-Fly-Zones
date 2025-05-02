import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Input from '../../../../src/components/input/input.tsx';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const mod = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  );
  return {
    ...mod,
    useNavigate: () => mockNavigate,
  };
});

test('renders input fields and buttons', () => {
  render(
    <MemoryRouter>
      <Input />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: /create new instance/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /map/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /no-fly zones/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /number of drones/i })).toBeInTheDocument();

  expect(screen.getByPlaceholderText('Coordinate')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Length')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Width')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('No-Fly Zone')).toBeInTheDocument();
  expect(screen.getByPlaceholderText('Enter number of drones')).toBeInTheDocument();

  expect(screen.getByRole('button', { name: '+ No-Fly Zone' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '+ New Instance' })).toBeInTheDocument();
});

test('adds a new no-fly zone when button is clicked', () => {
  render(
    <MemoryRouter>
      <Input />
    </MemoryRouter>
  );

  const addNoFlyZoneButton = screen.getByRole('button', { name: '+ No-Fly Zone' });

  expect(screen.getAllByPlaceholderText('No-Fly Zone')).toHaveLength(1);

  fireEvent.click(addNoFlyZoneButton);

  expect(screen.getAllByPlaceholderText('No-Fly Zone')).toHaveLength(2);
});

test('updates drone count input', () => {
  render(
    <MemoryRouter>
      <Input />
    </MemoryRouter>
  );

  const droneInput = screen.getByPlaceholderText('Enter number of drones') as HTMLInputElement;

  expect(droneInput.value).toBe('');

  fireEvent.change(droneInput, { target: { value: '5' } });

  expect(droneInput.value).toBe('5');
});

test('calls navigation function when clicking "+ New Instance" button', () => {
  render(
    <MemoryRouter>
      <Input />
    </MemoryRouter>
  );

  const newInstanceButton = screen.getByRole('button', { name: '+ New Instance' });

  fireEvent.click(newInstanceButton);

  expect(mockNavigate).toHaveBeenCalledWith('/');
});
