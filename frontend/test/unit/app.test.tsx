import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App';

describe('App component', () => {
  it('renders Home page when navigating to root path', () => {
    render(<App />);
    expect(screen.getByText(/smart drone fleet router/i)).toBeInTheDocument();
  });

  it('renders Discover page when navigating to /discover', () => {
    window.history.pushState({}, '', '/discover');
    render(<App />);
    expect(screen.getByText(/discover/i)).toBeInTheDocument();
  });

  it('renders Plan page when navigating to /plan', () => {
    window.history.pushState({}, '', '/plan');
    render(<App />);
    expect(screen.getByText(/plan/i)).toBeInTheDocument();
  });

  it('renders Manage page when navigating to /manage', () => {
    window.history.pushState({}, '', '/manage');
    render(<App />);
    expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
  });

  it('renders About page when navigating to /about', () => {
    window.history.pushState({}, '', '/about');
    render(<App />);
    expect(screen.getByText(/about/i)).toBeInTheDocument();
  });
});
