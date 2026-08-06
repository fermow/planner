export function formatCountdown(dueDate: Date, now: Date): string {
  const diff = dueDate.getTime() - now.getTime();

  if (diff <= 0) return 'Overdue';

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h left`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
}

export function formatCountdownPrecise(dueDate: Date, now: Date): string {
  const diff = dueDate.getTime() - now.getTime();

  if (diff <= 0) return 'Overdue';

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function calculateTimeProgress(dueDate: Date, createdAt: string, now: Date): number {
  const created = new Date(createdAt);
  const total = dueDate.getTime() - created.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - created.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export function formatDueDate(dueDate: Date): string {
  return dueDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function formatDateMonth(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });
}

export function formatWeekday(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function formatWeekdayShort(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

export function formatMoney(n: number): string {
  return n.toLocaleString('en-US');
}
