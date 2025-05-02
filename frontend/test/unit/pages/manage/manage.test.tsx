import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Manage from "../../../../src/pages/manage/Manage";

describe("Manage component", () => {
  it("displays 'No Projects Found' when no projects are passed", () => {
    render(<Manage projects={[]} />);
    expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
    expect(screen.getByText(/creating your first project/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create project/i })).toBeInTheDocument();
  });

  it("renders project cards when projects are passed", () => {
    const mockProjects = [
      {
        id: "1",
        title: "Drone Mapping",
        description: "Mapping Iowa farmland",
        createdAt: new Date().toISOString(),
      },
      {
        id: "2",
        title: "Security Sweep",
        description: "Drone perimeter flight",
        createdAt: new Date().toISOString(),
      },
    ];

    render(<Manage projects={mockProjects} />);
    expect(screen.getByText(/Drone Mapping/i)).toBeInTheDocument();
    expect(screen.getByText(/Security Sweep/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /view details/i })).toHaveLength(2);
  });

  it("navigates to /plan when 'Create Project' button is clicked", async () => {
    delete window.location;
    window.location = { href: "" } as any;

    render(<Manage projects={[]} />);
    const button = screen.getByRole("button", { name: /create project/i });
    await userEvent.click(button);
    expect(window.location.href).toBe("/plan");
  });
});
