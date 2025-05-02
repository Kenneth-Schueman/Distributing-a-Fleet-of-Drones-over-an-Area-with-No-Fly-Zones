import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import NavigationMenu from '../../../../src/components/nav/Nav.tsx';

describe('NavigationMenu Component', () => {
  it('renders drone home link', () => {
    render(<NavigationMenu />);
    const droneLink = screen.getByTestId('drone-link');
    expect(droneLink).toBeInTheDocument();
    expect(droneLink).toHaveAttribute('href', '/');
  });

  it('renders all navigation links with correct labels', () => {
    render(<NavigationMenu />);

    const navItems = [
      { label: 'Home', id: 'home' },
      { label: 'Discover', id: 'discover' },
      { label: 'Plan', id: 'plan' },
      { label: 'Operate', id: 'operate' },
      { label: 'Create Targets', id: 'create-targets' },
      { label: 'About', id: 'about' },
    ];

    navItems.forEach(({ label, id }) => {
      const link = screen.getByTestId(`${id}-link`);
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent(label);
    });
  });
});
