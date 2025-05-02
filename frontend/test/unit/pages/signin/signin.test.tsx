import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import SignInPopup from "../../../../src/pages/signin/Signin.tsx";

describe("SignInPopup component", () => {
  it("renders correctly when visible", () => {
    render(<SignInPopup isVisible={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', {name: /sign in/i})).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("does not render when not visible", () => {
    render(<SignInPopup isVisible={false} onClose={vi.fn()} />);
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });

  it("hides error message when both email and password are provided", async () => {
    render(<SignInPopup isVisible={true} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "password123" } });
    const submitButton = screen.getByRole('button', {name: /sign in/i});
    fireEvent.click(submitButton);
    expect(screen.queryByText(/please fill in all fields/i)).not.toBeInTheDocument();
  });

  it("toggles password visibility when the eye icon is clicked", () => {
    render(<SignInPopup isVisible={true} onClose={vi.fn()} />);
    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole("button", { name: '' });

    expect(passwordInput).toHaveAttribute("type", "password");
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
  });
});
