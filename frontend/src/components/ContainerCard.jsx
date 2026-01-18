function ContainerCard({ container, onAction, onShowLogs, actionLoading }) {
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatPorts = (ports) => {
    if (!ports || ports.length === 0) return 'None';
    return ports
      .filter(p => p.PublicPort)
      .map(p => `${p.PublicPort}:${p.PrivatePort}/${p.Type}`)
      .join(', ') || 'None exposed';
  };

  const isRunning = container.state === 'running';
  const isLoading = (action) => actionLoading[`${container.id}-${action}`];

  return (
    <div className="container-card">
      <div className="container-header">
        <span className="container-name">{container.name}</span>
        <span className={`container-status ${container.state}`}>
          {container.state}
        </span>
      </div>

      <div className="container-details">
        <div>
          <span className="label">Image:</span>
          <span className="value">{container.image}</span>
        </div>
        <div>
          <span className="label">ID:</span>
          <span className="value">{container.shortId}</span>
        </div>
        <div>
          <span className="label">Status:</span>
          <span className="value">{container.status}</span>
        </div>
        <div>
          <span className="label">Ports:</span>
          <span className="value">{formatPorts(container.ports)}</span>
        </div>
        <div>
          <span className="label">Created:</span>
          <span className="value">{formatDate(container.created)}</span>
        </div>
      </div>

      <div className="container-actions">
        {!isRunning ? (
          <button
            className="action-btn start"
            onClick={() => onAction(container.id, 'start', container.name)}
            disabled={isLoading('start')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
            {isLoading('start') ? 'Starting...' : 'Start'}
          </button>
        ) : (
          <button
            className="action-btn stop"
            onClick={() => onAction(container.id, 'stop', container.name)}
            disabled={isLoading('stop')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12"/>
            </svg>
            {isLoading('stop') ? 'Stopping...' : 'Stop'}
          </button>
        )}

        <button
          className="action-btn restart"
          onClick={() => onAction(container.id, 'restart', container.name)}
          disabled={isLoading('restart') || !isRunning}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {isLoading('restart') ? 'Restarting...' : 'Restart'}
        </button>

        <button
          className="action-btn upgrade"
          onClick={() => onAction(container.id, 'upgrade', container.name)}
          disabled={isLoading('upgrade')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {isLoading('upgrade') ? 'Upgrading...' : 'Upgrade'}
        </button>

        <button
          className="action-btn logs"
          onClick={() => onShowLogs(container)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          Logs
        </button>
      </div>
    </div>
  );
}

export default ContainerCard;
