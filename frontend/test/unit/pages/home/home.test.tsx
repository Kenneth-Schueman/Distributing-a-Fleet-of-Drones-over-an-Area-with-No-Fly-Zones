import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Home from '../../../../src/pages/home/Home.tsx';

describe('Home component', () => {
  test('renders hero text and features', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText(/Smart Drone Fleet Router/i)).toBeInTheDocument();
    expect(screen.getByText(/Plan Your Route/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: /FAA Compliance/i})).toBeInTheDocument();
    expect(screen.getByText(/Upload Map/i)).toBeInTheDocument();
  });

  test('navigates to /plan when "Plan Your Route" button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plan" element={<div>Route Planning Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    const button = screen.getByText(/Plan Your Route/i);
    await user.click(button);

    expect(await screen.findByText(/Route Planning Page/i)).toBeInTheDocument();
  });
});
