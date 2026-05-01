import { useState, useEffect, useCallback } from 'react';
import { fetchExecutions, fetchWorkflows, fetchExecutionDetails, cancelExecution } from './api';
import type { Execution, ExecutionDetails, Workflow, Stats } from './types';
import { formatTime, formatDuration, formatDateTime } from './utils';

type FilterType = 'all' | 'running' | 'completed' | 'failed';

function App() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, running: 0, completed: 0, failed: 0, cancelled: 0 });
  const [filter, setFilter] = useState<FilterType>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionDetails | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [execData, workflowData] = await Promise.all([
        fetchExecutions(),
        fetchWorkflows(),
      ]);
      
      setExecutions(execData.executions);
      setWorkflows(workflowData.workflows);
      
      // Calculate stats
      const newStats: Stats = { total: 0, running: 0, completed: 0, failed: 0, cancelled: 0 };
      execData.executions.forEach((e: Execution) => {
        newStats.total++;
        if (e.status in newStats) {
          newStats[e.status as keyof Stats]++;
        }
      });
      setStats(newStats);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load data:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const handleViewDetails = async (id: string) => {
    setModalOpen(true);
    setSelectedExecution(null);
    try {
      const details = await fetchExecutionDetails(id);
      setSelectedExecution(details);
    } catch (err) {
      console.error('Failed to load details:', err);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this execution?')) return;
    try {
      const result = await cancelExecution(id);
      alert(result.message || result.error);
      loadData();
    } catch (err) {
      alert('Failed to cancel execution');
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedExecution(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredExecutions = filter === 'all' 
    ? executions 
    : executions.filter(e => e.status === filter);

  return (
    <div className="container">
      <h1>Habits Management <span>Execution Monitor</span></h1>
      
      {/* Stats */}
      <div className="stats">
        <div className="stat">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat running">
          <div className="stat-value">{stats.running}</div>
          <div className="stat-label">Running</div>
        </div>
        <div className="stat completed">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat failed">
          <div className="stat-value">{stats.failed}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="stat cancelled">
          <div className="stat-value">{stats.cancelled}</div>
          <div className="stat-label">Cancelled</div>
        </div>
      </div>

      {/* Controls */}
      <div className="header-row">
        <div className="tabs">
          {(['all', 'running', 'completed', 'failed'] as FilterType[]).map(f => (
            <button
              key={f}
              className={`tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <label className="auto-refresh">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto-refresh (5s)
        </label>
        <button className="btn btn-refresh" onClick={loadData}>↻ Refresh</button>
      </div>

      {/* Executions Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Execution ID</th>
              <th>Workflow</th>
              <th>Status</th>
              <th>Started</th>
              <th>Duration</th>
              <th>Progress</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading">Loading...</td></tr>
            ) : filteredExecutions.length === 0 ? (
              <tr><td colSpan={7} className="empty">No executions found</td></tr>
            ) : (
              filteredExecutions.map(e => (
                <tr key={e.id}>
                  <td><code>{e.id.substring(0, 8)}...</code></td>
                  <td>{e.workflowName || e.workflowId}</td>
                  <td><span className={`status ${e.status}`}>{e.status}</span></td>
                  <td>{formatTime(e.startTime)}</td>
                  <td>{formatDuration(e.duration)}</td>
                  <td>{e.completedNodes}/{e.nodeCount} nodes</td>
                  <td className="actions">
                    <button className="btn btn-view" onClick={() => handleViewDetails(e.id)}>View</button>
                    <button 
                      className="btn btn-cancel" 
                      onClick={() => handleCancel(e.id)}
                      disabled={e.status !== 'running'}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Workflows Section */}
      <h2>Loaded Workflows</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Nodes</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {workflows.length === 0 ? (
              <tr><td colSpan={4} className="empty">No workflows loaded</td></tr>
            ) : (
              workflows.map(w => (
                <tr key={w.id}>
                  <td><code>{w.id}</code></td>
                  <td>{w.name}</td>
                  <td>{w.nodeCount}</td>
                  <td>
                    <span className={`status ${w.enabled ? 'completed' : 'cancelled'}`}>
                      {w.enabled ? 'Yes' : 'No'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <div 
        className={`modal-overlay ${modalOpen ? 'show' : ''}`}
        onClick={(e) => e.target === e.currentTarget && closeModal()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h3>
              {selectedExecution 
                ? `Execution: ${selectedExecution.id.substring(0, 12)}...`
                : 'Execution Details'}
            </h3>
            <button className="modal-close" onClick={closeModal}>&times;</button>
          </div>
          <div className="modal-body">
            {!selectedExecution ? (
              <div className="loading">Loading...</div>
            ) : (
              <>
                <div className="detail-section">
                  <h4>Overview</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="detail-label">Status</div>
                      <div className="detail-value">
                        <span className={`status ${selectedExecution.status}`}>
                          {selectedExecution.status}
                        </span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Workflow</div>
                      <div className="detail-value">
                        {selectedExecution.workflowName || selectedExecution.workflowId}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Started</div>
                      <div className="detail-value">{formatDateTime(selectedExecution.startTime)}</div>
                    </div>
                    <div className="detail-item">
                      <div className="detail-label">Duration</div>
                      <div className="detail-value">{formatDuration(selectedExecution.duration)}</div>
                    </div>
                  </div>
                </div>

                {selectedExecution.inputParams && (
                  <div className="detail-section">
                    <h4>Input Parameters</h4>
                    <pre><code>{JSON.stringify(selectedExecution.inputParams, null, 2)}</code></pre>
                  </div>
                )}

                <div className="detail-section">
                  <h4>Node Status ({selectedExecution.completedNodes}/{selectedExecution.nodeCount} completed)</h4>
                  <div className="node-list">
                    {selectedExecution.nodeStatuses.map(n => (
                      <div key={n.nodeId}>
                        <div className="node-item">
                          <div className="node-info">
                            <div className="node-name">{n.nodeName}</div>
                            <div className="node-id">{n.nodeId}</div>
                          </div>
                          <span className={`status ${n.status}`}>{n.status}</span>
                          <div className="node-meta">
                            {n.duration && <span>⏱ {formatDuration(n.duration)}</span>}
                          </div>
                        </div>
                        {n.error && <div className="error-box">Error: {n.error}</div>}
                        {n.result !== undefined && n.result !== null && (
                          <details>
                            <summary>View Output</summary>
                            <pre><code>{JSON.stringify(n.result, null, 2)}</code></pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedExecution.output && (
                  <div className="detail-section">
                    <h4>Workflow Output</h4>
                    <pre><code>{JSON.stringify(selectedExecution.output, null, 2)}</code></pre>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
