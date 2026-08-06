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

  // Sports
  getSports: () => request<any[]>('/sports'),
  createSportEntry: (data: any) => request<any>('/sports', { method: 'POST', body: JSON.stringify(data) }),
  updateSportEntry: (id: string, data: any) => request<any>(`/sports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSportEntry: (id: string) => request<any>(`/sports/${id}`, { method: 'DELETE' }),
  getSportByDate: (date: string) => request<any>(`/sports/date/${date}`),

  // Finance
  getFinanceCards: () => request<any[]>('/finance/cards'),
  createFinanceCard: (data: any) => request<any>('/finance/cards', { method: 'POST', body: JSON.stringify(data) }),
  updateFinanceCard: (id: string, data: any) => request<any>(`/finance/cards/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFinanceCard: (id: string) => request<any>(`/finance/cards/${id}`, { method: 'DELETE' }),
  getFinanceTransactions: () => request<any[]>('/finance/transactions'),
  createFinanceTransaction: (data: any) => request<any>('/finance/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateFinanceTransaction: (id: string, data: any) => request<any>(`/finance/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFinanceTransaction: (id: string) => request<any>(`/finance/transactions/${id}`, { method: 'DELETE' }),

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

  // AI Chat
  aiChatStream: (messages: any[], mode: string = 'chat', onChunk: (text: string) => void, onDone: (timestamp: string) => void) => {
    fetch(`${BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, mode }),
    }).then(async (res) => {
      if (!res.ok) throw new Error('Chat request failed');
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.chunk) onChunk(data.chunk);
            if (data.done) onDone(data.timestamp);
          } catch {}
        }
      }
    });
  },
  aiHealth: () => request<any>('/ai/health'),
  aiHistory: (limit: number = 50) => request<any>(`/ai/history?limit=${limit}`),
  aiClearHistory: () => request<any>('/ai/history', { method: 'DELETE' }),
};
