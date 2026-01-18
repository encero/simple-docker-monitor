import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

describe('App', () => {
  const mockContainers = [
    {
      id: 'abc123',
      shortId: 'abc123',
      name: 'nginx-container',
      image: 'nginx:latest',
      state: 'running',
      status: 'Up 2 hours',
      created: 1704067200,
      ports: [{ PublicPort: 80, PrivatePort: 80, Type: 'tcp' }],
    },
    {
      id: 'def456',
      shortId: 'def456',
      name: 'redis-container',
      image: 'redis:latest',
      state: 'exited',
      status: 'Exited (0) 1 hour ago',
      created: 1704067200,
      ports: [],
    },
  ];

  const mockSystemInfo = {
    containersRunning: 1,
    containersStopped: 1,
    images: 5,
    memory: 8589934592,
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const getFilterButton = (name) => {
    const buttons = screen.getAllByRole('button');
    return buttons.find(btn => btn.classList.contains('filter-btn') && btn.textContent.includes(name));
  };

  it('renders Docker Monitor header', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/containers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockContainers),
        });
      }
      if (url === '/api/system/info') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystemInfo),
        });
      }
    });

    render(<App />);
    expect(screen.getByText('Docker Monitor')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    global.fetch.mockImplementation(() => new Promise(() => {}));

    render(<App />);
    expect(screen.getByText('Loading containers...')).toBeInTheDocument();
  });

  it('displays containers after fetching', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/containers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockContainers),
        });
      }
      if (url === '/api/system/info') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystemInfo),
        });
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('nginx-container')).toBeInTheDocument();
      expect(screen.getByText('redis-container')).toBeInTheDocument();
    });
  });

  it('displays system info in header', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/containers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockContainers),
        });
      }
      if (url === '/api/system/info') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystemInfo),
        });
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Running:')).toBeInTheDocument();
    });
  });

  it('displays error message on fetch failure', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/containers') {
        return Promise.resolve({
          ok: false,
        });
      }
      if (url === '/api/system/info') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystemInfo),
        });
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('filters containers by running state', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/containers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockContainers),
        });
      }
      if (url === '/api/system/info') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystemInfo),
        });
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('nginx-container')).toBeInTheDocument();
    });

    const runningBtn = getFilterButton('Running');
    fireEvent.click(runningBtn);

    expect(screen.getByText('nginx-container')).toBeInTheDocument();
    expect(screen.queryByText('redis-container')).not.toBeInTheDocument();
  });

  it('filters containers by stopped state', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/containers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockContainers),
        });
      }
      if (url === '/api/system/info') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystemInfo),
        });
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('nginx-container')).toBeInTheDocument();
    });

    const stoppedBtn = getFilterButton('Stopped');
    fireEvent.click(stoppedBtn);

    expect(screen.queryByText('nginx-container')).not.toBeInTheDocument();
    expect(screen.getByText('redis-container')).toBeInTheDocument();
  });

  it('shows all containers when All filter is selected', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/containers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockContainers),
        });
      }
      if (url === '/api/system/info') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystemInfo),
        });
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('nginx-container')).toBeInTheDocument();
    });

    const runningBtn = getFilterButton('Running');
    fireEvent.click(runningBtn);

    const allBtn = getFilterButton('All');
    fireEvent.click(allBtn);

    expect(screen.getByText('nginx-container')).toBeInTheDocument();
    expect(screen.getByText('redis-container')).toBeInTheDocument();
  });

  it('shows empty state when no containers match filter', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/containers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockContainers[0]]),
        });
      }
      if (url === '/api/system/info') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystemInfo),
        });
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('nginx-container')).toBeInTheDocument();
    });

    const stoppedBtn = getFilterButton('Stopped');
    fireEvent.click(stoppedBtn);

    expect(screen.getByText('No containers found')).toBeInTheDocument();
  });

  it('refreshes containers when refresh button is clicked', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/containers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockContainers),
        });
      }
      if (url === '/api/system/info') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystemInfo),
        });
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('nginx-container')).toBeInTheDocument();
    });

    const initialCallCount = global.fetch.mock.calls.length;

    fireEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(global.fetch.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it('opens logs modal when logs button is clicked', async () => {
    global.fetch.mockImplementation((url) => {
      if (url === '/api/containers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockContainers),
        });
      }
      if (url === '/api/system/info') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystemInfo),
        });
      }
      if (url.includes('/logs')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ logs: 'container logs here' }),
        });
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('nginx-container')).toBeInTheDocument();
    });

    const logsButtons = screen.getAllByText('Logs');
    fireEvent.click(logsButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Logs: nginx-container')).toBeInTheDocument();
    });
  });

  it('performs container action and shows toast', async () => {
    global.fetch.mockImplementation((url, options) => {
      if (url === '/api/containers') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockContainers),
        });
      }
      if (url === '/api/system/info') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSystemInfo),
        });
      }
      if (url.includes('/stop')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Container stopped' }),
        });
      }
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('nginx-container')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Stop'));

    await waitFor(() => {
      expect(screen.getByText('nginx-container: Container stopped')).toBeInTheDocument();
    });
  });
});
