import { render, screen, fireEvent } from '@testing-library/react';
import SignInPopup from '../../../../src/components/signup/Signup.tsx';

describe('SignInPopup', () => {
  const setup = () => {
    const onClose = vi.fn();
    render(<SignInPopup isVisible={true} onClose={onClose} />);
    return { onClose };
  };

  it('renders when isVisible is true', () => {
    setup();
    expect(screen.getByRole('button', {name: 'Sign In'})).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    render(<SignInPopup isVisible={false} onClose={() => {}} />);
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });

  it('submits the form when fields are filled', () => {
    setup();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', {name: 'Sign In'}));
    expect(screen.queryByText('Please fill in all fields')).not.toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    setup();

    const passwordInput = screen.getByLabelText('Password');
    const toggleButton = screen.getByRole('button', { name: '' });

    // Initially should be password type
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('calls onClose when clicking the overlay', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole('button', {name: 'Sign In'}).closest('.popup-overlay')!);
    expect(onClose).toHaveBeenCalled();
  });
});
