import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import Header from '../../../../src/components/header/header.tsx';
import useWebSocket from '../../../../src/services/WebSocketConnect/WebSocketConnect';

vi.mock('../../../../src/services/WebSocketConnect/WebSocketConnect', () => ({
  default: vi.fn(),
}));

describe('Header Component', () => {
  beforeEach(() => {
    useWebSocket.mockReturnValue({
      isConnected: true,
      status: 'connected',
      statusMessage: 'Connected successfully',
    });
  });

  test('renders header with search input and icons', () => {
    render(<Header />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByAltText('Profile')).toBeInTheDocument();
    expect(screen.getByAltText('Add')).toBeInTheDocument();
  });

  test('toggles sign-in popup on profile icon click', () => {
    render(<Header />);

    const profileIcon = screen.getByAltText('Profile');
    fireEvent.click(profileIcon);

    expect(screen.getByRole('button', {
        name: 'Sign In'
    })).toBeInTheDocument();

    fireEvent.click(profileIcon);
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });

  test('toggles connection popup on add icon click', () => {
    render(<Header />);

    const addIcon = screen.getByAltText('Add');
    fireEvent.click(addIcon);

    expect(screen.getByText('New Project')).toBeInTheDocument();

    fireEvent.click(addIcon);
    expect(screen.queryByText('New Project')).not.toBeInTheDocument();
  });

  test('displays WebSocket status message correctly', () => {
    render(<Header />);

    fireEvent.click(screen.getByAltText('Add')); // Open connection popup

    expect(screen.getByText('Connected successfully')).toBeInTheDocument();
  });

  test('shows loader when WebSocket is connecting', () => {
    useWebSocket.mockReturnValue({
      isConnected: false,
      status: 'connecting',
      statusMessage: 'Connecting...',
    });

    render(<Header />);
    fireEvent.click(screen.getByAltText('Add')); // Open connection popup

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });
});
