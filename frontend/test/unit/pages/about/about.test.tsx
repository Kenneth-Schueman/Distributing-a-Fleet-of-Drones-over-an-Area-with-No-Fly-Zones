import { render, screen } from '@testing-library/react';
import About from '../../../../src/pages/about/About.tsx';

describe('About Component', () => {
  it('renders the project title and overview', () => {
    render(<About />);

    expect(screen.getByText(/Senior Design Team sdmay25-21/i)).toBeInTheDocument();
    expect(screen.getByText(/Project Overview/i)).toBeInTheDocument();
    expect(screen.getByText(/The main goal of this project is to implement algorithms/i)).toBeInTheDocument();
  });

  it('renders team members with their information', () => {
    render(<About />);

    expect(screen.getByText(/Cole Stuedeman/i)).toBeInTheDocument();
    expect(screen.getByText(/Everett Duffy/i)).toBeInTheDocument();
    expect(screen.getByText(/Kenneth Schueman/i)).toBeInTheDocument();
    expect(screen.getByText(/Melani Hodge/i)).toBeInTheDocument();
    expect(screen.getByText(/Nicholas Kokott/i)).toBeInTheDocument();
    expect(screen.getByText(/Samuel Russett/i)).toBeInTheDocument();

    expect(screen.getByText(/Testing/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Senior in Software Engineering/i).length).toStrictEqual(5);
    expect(screen.getAllByText(/Design/i).length).toStrictEqual(3);
    expect(screen.getAllByText(/Senior in Computer Engineering/i).length).toStrictEqual(1);
  });

  it('renders team member images correctly', () => {
    render(<About />);

    const images = screen.getAllByRole('img');
    expect(images.length).toBe(6);
  });
});
