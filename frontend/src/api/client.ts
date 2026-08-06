const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || res.statusText);
  }
  return res.json();
}

export const api = {
  // Deadlines
  getDeadlines: () => request<any[]>('/deadlines'),
  createDeadline: (data: any) => request<any>('/deadlines', { method: 'POST', body: JSON.stringify(data) }),
  updateDeadline: (id: string, data: any) => request<any>(`/deadlines/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDeadline: (id: string) => request<any>(`/deadlines/${id}`, { method: 'DELETE' }),

  // Planner
  getPlanner: (weekStart?: string) => request<any[]>(`/planner${weekStart ? `?week_start=${weekStart}` : ''}`),
  createPlannerEntry: (data: any) => request<any>('/planner', { method: 'POST', body: JSON.stringify(data) }),
  updatePlannerEntry: (id: string, data: any) => request<any>(`/planner/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePlannerEntry: (id: string) => request<any>(`/planner/${id}`, { method: 'DELETE' }),

  // Journal
  getJournal: (date?: string) => request<any[]>(`/journal${date ? `?date=${date}` : ''}`),
  createJournalEntry: (data: any) => request<any>('/journal', { method: 'POST', body: JSON.stringify(data) }),
  updateJournalEntry: (id: string, data: any) => request<any>(`/journal/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteJournalEntry: (id: string) => request<any>(`/journal/${id}`, { method: 'DELETE' }),

  // Tables
  getTables: () => request<any[]>('/tables'),
  createTable: () => request<any>('/tables', { method: 'POST' }),
  getTable: (id: string) => request<any>(`/tables/${id}`),
  updateTable: (id: string, data: any) => request<any>(`/tables/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTable: (id: string) => request<any>(`/tables/${id}`, { method: 'DELETE' }),

  // Whiteboards
  getWhiteboards: () => request<any[]>('/whiteboards'),
  createWhiteboard: () => request<any>('/whiteboards', { method: 'POST' }),
  getWhiteboard: (id: string) => request<any>(`/whiteboards/${id}`),
  updateWhiteboard: (id: string, data: any) => request<any>(`/whiteboards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWhiteboard: (id: string) => request<any>(`/whiteboards/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => request<any[]>('/notifications'),
  markRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'POST' }),

  // Search
  search: (q: string) => request<any>(`/search?q=${encodeURIComponent(q)}`),

  // Backup
  exportBackup: () => fetch('/api/backup/export').then(r => r.blob()),
  importBackup: (data: any) => request<any>('/backup/import', { method: 'POST', body: JSON.stringify(data) }),

  // Daily Activities
  getDailyActivities: (date?: string) => request<any[]>(`/daily-activities${date ? `?date=${date}` : ''}`),
  createDailyActivity: (data: any) => request<any>('/daily-activities', { method: 'POST', body: JSON.stringify(data) }),
  updateDailyActivity: (id: string, data: any) => request<any>(`/daily-activities/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDailyActivity: (id: string) => request<any>(`/daily-activities/${id}`, { method: 'DELETE' }),
  getDailyActivityByDate: (date: string) => request<any>(`/daily-activities/date/${date}`),

  // Report
  getReport: (startDate: string, endDate: string) => request<any>(`/report?start_date=${startDate}&end_date=${endDate}`),

  // Daily Summary
  getDailySummary: (date: string) => request<any>(`/daily-summary?date=${date}`),
  getDailySummaries: (startDate: string, endDate: string) => request<any>(`/daily-summary/range?start_date=${startDate}&end_date=${endDate}`),
  generateDailySummary: () => request<any>('/daily-summary/generate-today', { method: 'POST' }),

  // Dashboard
  getDashboard: () => request<any>('/dashboard'),

  // Habits
  getHabits: () => request<any[]>('/habits'),
  createHabit: (data: any) => request<any>('/habits', { method: 'POST', body: JSON.stringify(data) }),
  updateHabit: (id: string, data: any) => request<any>(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteHabit: (id: string) => request<any>(`/habits/${id}`, { method: 'DELETE' }),

  // Life Tree
  getLifeTree: () => request<any[]>('/life-tree'),
  createLifeTree: (data: any) => request<any>('/life-tree', { method: 'POST', body: JSON.stringify(data) }),
  updateLifeTree: (id: string, data: any) => request<any>(`/life-tree/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteLifeTree: (id: string) => request<any>(`/life-tree/${id}`, { method: 'DELETE' }),

  // Connections
  getConnections: () => request<any[]>('/connections'),
  createConnection: (data: any) => request<any>('/connections', { method: 'POST', body: JSON.stringify(data) }),
  updateConnection: (id: string, data: any) => request<any>(`/connections/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteConnection: (id: string) => request<any>(`/connections/${id}`, { method: 'DELETE' }),
  searchConnections: (q: string) => request<any[]>(`/connections/search?q=${encodeURIComponent(q)}`),
  updateConnectionPositions: (positions: { id: string; x: number; y: number }[]) =>
    request<any>('/connections/positions/bulk', { method: 'POST', body: JSON.stringify(positions) }),

  // Music
  getMusic: () => request<any[]>('/music'),
  uploadMusic: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/music/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  updateMusic: (id: string, data: any) => request<any>(`/music/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMusic: (id: string) => request<any>(`/music/${id}`, { method: 'DELETE' }),
};
