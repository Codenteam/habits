const API_BASE = '/manage';

export async function fetchExecutions() {
  const res = await fetch(`${API_BASE}/executions`);
  if (!res.ok) throw new Error('Failed to fetch executions');
  return res.json();
}

export async function fetchWorkflows() {
  const res = await fetch(`${API_BASE}/workflows`);
  if (!res.ok) throw new Error('Failed to fetch workflows');
  return res.json();
}

export async function fetchExecutionDetails(id: string) {
  const res = await fetch(`${API_BASE}/execution/${id}/full`);
  if (!res.ok) throw new Error('Failed to fetch execution details');
  return res.json();
}

export async function cancelExecution(id: string) {
  const res = await fetch(`${API_BASE}/execution/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to cancel execution');
  return res.json();
}
