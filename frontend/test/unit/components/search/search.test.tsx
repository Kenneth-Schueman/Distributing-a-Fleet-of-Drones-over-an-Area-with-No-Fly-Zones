import { render, screen, fireEvent } from '@testing-library/react';
import SearchInput from '../../../../src/components/search/Search.tsx';

describe('SearchInput', () => {
  it('renders input with placeholder and allows typing', () => {
    render(<SearchInput />);

    const input = screen.getByPlaceholderText('Search for a location');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'New York' } });
    expect(input).toHaveValue('New York');
  });

  it('renders the search icon', () => {
    render(<SearchInput />);

    const icon = screen.getByAltText('Search Icon');
    expect(icon).toBeInTheDocument();
  });
});
