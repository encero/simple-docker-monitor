import { useState, useEffect } from 'react';

function LogsModal({ container, onClose }) {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/containers/${container.id}/logs`);
        if (!response.ok) throw new Error('Failed to fetch logs');
        const data = await response.json();
        setLogs(data.logs || 'No logs available');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [container.id]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>Logs: {container.name}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div>Loading logs...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <div className="logs-container">{logs}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LogsModal;
