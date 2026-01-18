import { useState, useEffect, useCallback } from 'react';
import ContainerCard from './components/ContainerCard';
import LogsModal from './components/LogsModal';
import Toast from './components/Toast';

function App() {
  const [containers, setContainers] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [logsModal, setLogsModal] = useState({ open: false, container: null });
  const [toasts, setToasts] = useState([]);
  const [actionLoading, setActionLoading] = useState({});

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const fetchContainers = useCallback(async () => {
    try {
      const response = await fetch('/api/containers');
      if (!response.ok) throw new Error('Failed to fetch containers');
      const data = await response.json();
      setContainers(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSystemInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/system/info');
      if (!response.ok) throw new Error('Failed to fetch system info');
      const data = await response.json();
      setSystemInfo(data);
    } catch (err) {
      console.error('Failed to fetch system info:', err);
    }
  }, []);

  useEffect(() => {
    fetchContainers();
    fetchSystemInfo();
    const interval = setInterval(() => {
      fetchContainers();
      fetchSystemInfo();
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchContainers, fetchSystemInfo]);

  const handleAction = async (containerId, action, containerName) => {
    setActionLoading(prev => ({ ...prev, [`${containerId}-${action}`]: true }));
    try {
      const response = await fetch(`/api/containers/${containerId}/${action}`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error);
      addToast(`${containerName}: ${data.message}`, 'success');
      fetchContainers();
    } catch (err) {
      addToast(`${containerName}: ${err.message}`, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`${containerId}-${action}`]: false }));
    }
  };

  const handleShowLogs = (container) => {
    setLogsModal({ open: true, container });
  };

  const filteredContainers = containers.filter(container => {
    if (filter === 'all') return true;
    if (filter === 'running') return container.state === 'running';
    if (filter === 'stopped') return container.state === 'exited';
    return true;
  });

  const formatBytes = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  return (
    <div className="app">
      <header>
        <h1>
          <svg viewBox="0 0 24 24" fill="#2496ED">
            <path d="M13.983 11.078h2.119a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.119a.185.185 0 0 0-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 0 0 .186-.186V3.574a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 0 0 .186-.186V6.29a.186.186 0 0 0-.186-.185h-2.118a.185.185 0 0 0-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 0 0 .184-.186V6.29a.185.185 0 0 0-.185-.185H8.1a.185.185 0 0 0-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 0 0 .185-.186V6.29a.185.185 0 0 0-.185-.185H5.136a.186.186 0 0 0-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 0 0 .186-.185V9.006a.186.186 0 0 0-.186-.186h-2.118a.185.185 0 0 0-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 0 0 .185-.185V9.006a.185.185 0 0 0-.185-.186h-2.119a.186.186 0 0 0-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 0 0 .184-.185V9.006a.185.185 0 0 0-.184-.186h-2.12a.185.185 0 0 0-.184.185v1.888c0 .102.082.185.185.185M23.763 9.89c-.065-.051-.672-.51-1.954-.51-.338.001-.676.03-1.01.087-.248-1.7-1.653-2.53-1.716-2.566l-.344-.199-.226.327c-.284.438-.49.922-.612 1.43-.23.97-.09 1.882.403 2.661-.595.332-1.55.413-1.744.42H.751a.751.751 0 0 0-.75.748 11.376 11.376 0 0 0 .692 4.062c.545 1.428 1.355 2.48 2.41 3.124 1.18.723 3.1 1.137 5.275 1.137.983.003 1.963-.086 2.93-.266a12.248 12.248 0 0 0 3.823-1.389c.98-.567 1.86-1.288 2.61-2.136 1.252-1.418 1.998-2.997 2.553-4.4h.221c1.372 0 2.215-.549 2.68-1.009.309-.293.55-.65.707-1.046l.098-.288Z"/>
          </svg>
          Docker Monitor
        </h1>
        {systemInfo && (
          <div className="system-info">
            <span>
              Running: <span className="value">{systemInfo.containersRunning}</span>
            </span>
            <span>
              Stopped: <span className="value">{systemInfo.containersStopped}</span>
            </span>
            <span>
              Images: <span className="value">{systemInfo.images}</span>
            </span>
            <span>
              Memory: <span className="value">{formatBytes(systemInfo.memory)}</span>
            </span>
          </div>
        )}
      </header>

      {error && <div className="error-message">Error: {error}</div>}

      <div className="controls">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({containers.length})
          </button>
          <button
            className={`filter-btn ${filter === 'running' ? 'active' : ''}`}
            onClick={() => setFilter('running')}
          >
            Running ({containers.filter(c => c.state === 'running').length})
          </button>
          <button
            className={`filter-btn ${filter === 'stopped' ? 'active' : ''}`}
            onClick={() => setFilter('stopped')}
          >
            Stopped ({containers.filter(c => c.state === 'exited').length})
          </button>
        </div>
        <button
          className={`refresh-btn ${loading ? 'loading' : ''}`}
          onClick={() => { setLoading(true); fetchContainers(); fetchSystemInfo(); }}
          disabled={loading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading && containers.length === 0 ? (
        <div className="loading-spinner">Loading containers...</div>
      ) : filteredContainers.length === 0 ? (
        <div className="empty-state">
          <h3>No containers found</h3>
          <p>{filter !== 'all' ? 'Try changing the filter' : 'No Docker containers are running'}</p>
        </div>
      ) : (
        <div className="container-grid">
          {filteredContainers.map(container => (
            <ContainerCard
              key={container.id}
              container={container}
              onAction={handleAction}
              onShowLogs={handleShowLogs}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {logsModal.open && (
        <LogsModal
          container={logsModal.container}
          onClose={() => setLogsModal({ open: false, container: null })}
        />
      )}

      <div className="toast-container">
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} />
        ))}
      </div>
    </div>
  );
}

export default App;
