import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ContainerCard from './ContainerCard';

describe('ContainerCard', () => {
  const runningContainer = {
    id: 'abc123def456',
    shortId: 'abc123def456',
    name: 'test-container',
    image: 'nginx:latest',
    state: 'running',
    status: 'Up 2 hours',
    created: 1704067200,
    ports: [{ PublicPort: 80, PrivatePort: 80, Type: 'tcp' }],
  };

  const stoppedContainer = {
    ...runningContainer,
    state: 'exited',
    status: 'Exited (0) 1 hour ago',
  };

  const defaultProps = {
    container: runningContainer,
    onAction: vi.fn(),
    onShowLogs: vi.fn(),
    actionLoading: {},
  };

  it('renders container name', () => {
    render(<ContainerCard {...defaultProps} />);
    expect(screen.getByText('test-container')).toBeInTheDocument();
  });

  it('renders container image', () => {
    render(<ContainerCard {...defaultProps} />);
    expect(screen.getByText('nginx:latest')).toBeInTheDocument();
  });

  it('renders container status', () => {
    render(<ContainerCard {...defaultProps} />);
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('Up 2 hours')).toBeInTheDocument();
  });

  it('renders container ID', () => {
    render(<ContainerCard {...defaultProps} />);
    expect(screen.getByText('abc123def456')).toBeInTheDocument();
  });

  it('renders ports correctly', () => {
    render(<ContainerCard {...defaultProps} />);
    expect(screen.getByText('80:80/tcp')).toBeInTheDocument();
  });

  it('shows Stop button for running container', () => {
    render(<ContainerCard {...defaultProps} />);
    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(screen.queryByText('Start')).not.toBeInTheDocument();
  });

  it('shows Start button for stopped container', () => {
    render(<ContainerCard {...defaultProps} container={stoppedContainer} />);
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.queryByText('Stop')).not.toBeInTheDocument();
  });

  it('calls onAction when Stop button is clicked', () => {
    const onAction = vi.fn();
    render(<ContainerCard {...defaultProps} onAction={onAction} />);

    fireEvent.click(screen.getByText('Stop'));
    expect(onAction).toHaveBeenCalledWith('abc123def456', 'stop', 'test-container');
  });

  it('calls onAction when Start button is clicked', () => {
    const onAction = vi.fn();
    render(<ContainerCard {...defaultProps} container={stoppedContainer} onAction={onAction} />);

    fireEvent.click(screen.getByText('Start'));
    expect(onAction).toHaveBeenCalledWith('abc123def456', 'start', 'test-container');
  });

  it('calls onAction when Restart button is clicked', () => {
    const onAction = vi.fn();
    render(<ContainerCard {...defaultProps} onAction={onAction} />);

    fireEvent.click(screen.getByText('Restart'));
    expect(onAction).toHaveBeenCalledWith('abc123def456', 'restart', 'test-container');
  });

  it('calls onAction when Upgrade button is clicked', () => {
    const onAction = vi.fn();
    render(<ContainerCard {...defaultProps} onAction={onAction} />);

    fireEvent.click(screen.getByText('Upgrade'));
    expect(onAction).toHaveBeenCalledWith('abc123def456', 'upgrade', 'test-container');
  });

  it('calls onShowLogs when Logs button is clicked', () => {
    const onShowLogs = vi.fn();
    render(<ContainerCard {...defaultProps} onShowLogs={onShowLogs} />);

    fireEvent.click(screen.getByText('Logs'));
    expect(onShowLogs).toHaveBeenCalledWith(runningContainer);
  });

  it('disables Restart button for stopped container', () => {
    render(<ContainerCard {...defaultProps} container={stoppedContainer} />);
    expect(screen.getByText('Restart')).toBeDisabled();
  });

  it('shows loading state for Stop button', () => {
    render(
      <ContainerCard
        {...defaultProps}
        actionLoading={{ 'abc123def456-stop': true }}
      />
    );
    expect(screen.getByText('Stopping...')).toBeInTheDocument();
  });

  it('shows loading state for Start button', () => {
    render(
      <ContainerCard
        {...defaultProps}
        container={stoppedContainer}
        actionLoading={{ 'abc123def456-start': true }}
      />
    );
    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });

  it('shows loading state for Restart button', () => {
    render(
      <ContainerCard
        {...defaultProps}
        actionLoading={{ 'abc123def456-restart': true }}
      />
    );
    expect(screen.getByText('Restarting...')).toBeInTheDocument();
  });

  it('shows loading state for Upgrade button', () => {
    render(
      <ContainerCard
        {...defaultProps}
        actionLoading={{ 'abc123def456-upgrade': true }}
      />
    );
    expect(screen.getByText('Upgrading...')).toBeInTheDocument();
  });

  it('renders None when no ports exposed', () => {
    const containerWithoutPorts = { ...runningContainer, ports: [] };
    render(<ContainerCard {...defaultProps} container={containerWithoutPorts} />);
    expect(screen.getByText(/None/)).toBeInTheDocument();
  });
});
