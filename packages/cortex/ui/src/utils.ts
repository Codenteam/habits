export function formatTime(iso: string | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString();
}

export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms === null) return '-';
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  return (ms / 60000).toFixed(1) + 'm';
}

export function formatDateTime(iso: string | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString();
}
