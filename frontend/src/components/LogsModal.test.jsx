import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LogsModal from './LogsModal';

describe('LogsModal', () => {
  const mockContainer = {
    id: 'abc123def456',
    name: 'test-container',
  };

  const defaultProps = {
    container: mockContainer,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders modal with container name', () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ logs: 'test logs' }),
    });

    render(<LogsModal {...defaultProps} />);
    expect(screen.getByText('Logs: test-container')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));

    render(<LogsModal {...defaultProps} />);
    expect(screen.getByText('Loading logs...')).toBeInTheDocument();
  });

  it('displays logs after fetching', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ logs: 'container log output here' }),
    });

    render(<LogsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('container log output here')).toBeInTheDocument();
    });
  });

  it('displays "No logs available" when logs are empty', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ logs: '' }),
    });

    render(<LogsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No logs available')).toBeInTheDocument();
    });
  });

  it('displays error message on fetch failure', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
    });

    render(<LogsModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch logs')).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ logs: 'test logs' }),
    });

    const onClose = vi.fn();
    render(<LogsModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ logs: 'test logs' }),
    });

    const onClose = vi.fn();
    const { container } = render(<LogsModal {...defaultProps} onClose={onClose} />);

    const overlay = container.querySelector('.modal-overlay');
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when modal content is clicked', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ logs: 'test logs' }),
    });

    const onClose = vi.fn();
    const { container } = render(<LogsModal {...defaultProps} onClose={onClose} />);

    const modal = container.querySelector('.modal');
    fireEvent.click(modal);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('fetches logs with correct container ID', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ logs: 'test logs' }),
    });

    render(<LogsModal {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/containers/abc123def456/logs');
    });
  });
});
