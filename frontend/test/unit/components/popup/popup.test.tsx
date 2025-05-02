import { describe, it, vi, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileUploadPopup from '../../../../src/components/popup/FileUploadPopup.tsx';

describe('FileUploadPopup', () => {
  const file = new File(['{ "mock": "data" }'], 'targets.json', { type: 'application/json' });

  it('does not render when isOpen is false', () => {
    const { container } = render(<FileUploadPopup isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders when isOpen is true', () => {
    render(<FileUploadPopup isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/Upload Target File/i)).toBeInTheDocument();
  });

  it('displays selected file name and enables continue button', () => {
    render(<FileUploadPopup isOpen={true} onClose={() => {}} />);
    const fileInput = screen.getByRole('button', {name: 'Continue'}) || screen.getByRole('textbox');

    fireEvent.change(screen.getByTestId('file-upload'), {
      target: { files: [file] }
    });

    expect(screen.getByText(/Selected: targets.json/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  it('calls onClose with file when continue is clicked', () => {
    const mockOnClose = vi.fn();
    render(<FileUploadPopup isOpen={true} onClose={mockOnClose} />);

    fireEvent.change(screen.getByTestId('file-upload'), {
      target: { files: [file] }
    });

    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(mockOnClose).toHaveBeenCalledWith(file);
  });

  it('calls onClose with no args when cancel is clicked', () => {
    const mockOnClose = vi.fn();
    render(<FileUploadPopup isOpen={true} onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalledWith();
  });
});
