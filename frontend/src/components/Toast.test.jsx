import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  it('renders with message', () => {
    render(<Toast message="Test message" type="info" />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('applies info class correctly', () => {
    const { container } = render(<Toast message="Info message" type="info" />);
    expect(container.firstChild).toHaveClass('toast', 'info');
  });

  it('applies success class correctly', () => {
    const { container } = render(<Toast message="Success message" type="success" />);
    expect(container.firstChild).toHaveClass('toast', 'success');
  });

  it('applies error class correctly', () => {
    const { container } = render(<Toast message="Error message" type="error" />);
    expect(container.firstChild).toHaveClass('toast', 'error');
  });
});
