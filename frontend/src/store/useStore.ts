import { create } from 'zustand';
import type { Deadline, PlannerEntry, JournalEntry, Whiteboard, TableData, Notification, Page, SportEntry, FinanceCard, FinanceTransaction, LifeTreeEntry, Connection } from '../types';
import { api } from '../api/client';
import { t } from '../i18n/t';

const LS_PAGE_KEY = 'celestial-current-page';
const LS_THEME_KEY = 'celestial-theme';

function loadPage(): Page {
  try {
    const saved = localStorage.getItem(LS_PAGE_KEY);
    if (saved) return saved as Page;
  } catch {}
  return 'dashboard';
}

function savePage(page: Page) {
  try {
    localStorage.setItem(LS_PAGE_KEY, page);
  } catch {}
}

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(LS_THEME_KEY);
    if (saved === 'kawaii' || saved === 'default') return saved;
  } catch {}
  return 'default';
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(LS_THEME_KEY, theme);
  } catch {}
}

export type Theme = 'default' | 'kawaii';

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;

  currentPage: Page;
  setPage: (page: Page) => void;

  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  deadlines: Deadline[];
  planner: PlannerEntry[];
  journal: JournalEntry[];
  whiteboards: Whiteboard[];
  tables: TableData[];
  sports: SportEntry[];
  financeCards: FinanceCard[];
  financeTransactions: FinanceTransaction[];
  lifeTree: LifeTreeEntry[];
  connections: Connection[];
  notifications: Notification[];

  loading: boolean;
  error: string | null;
  searchQuery: string;
  searchResults: any;
  showSearch: boolean;

  // Toast
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;

  // Actions
  fetchDeadlines: () => Promise<void>;
  fetchPlanner: () => Promise<void>;
  fetchJournal: () => Promise<void>;
  fetchWhiteboards: () => Promise<void>;
  fetchTables: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  search: (q: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  toggleSearch: () => void;

  // Deadline actions
  addDeadline: (data: any) => Promise<void>;
  editDeadline: (id: string, data: any) => Promise<void>;
  removeDeadline: (id: string) => Promise<void>;

  // Planner actions
  addPlannerEntry: (data: any) => Promise<void>;
  editPlannerEntry: (id: string, data: any) => Promise<void>;
  removePlannerEntry: (id: string) => Promise<void>;

  // Journal actions
  addJournalEntry: (data: any) => Promise<void>;
  editJournalEntry: (id: string, data: any) => Promise<void>;
  removeJournalEntry: (id: string) => Promise<void>;

  // Table actions
  addTable: () => Promise<string>;
  removeTable: (id: string) => Promise<void>;
  saveTable: (id: string, data: any) => Promise<void>;

  // Whiteboard actions
  addWhiteboard: () => Promise<string>;
  removeWhiteboard: (id: string) => Promise<void>;
  saveWhiteboard: (id: string, data: any) => Promise<void>;

  // Notification
  dismissNotification: (id: string) => Promise<void>;

  // Sport actions
  fetchSports: () => Promise<void>;
  addSportEntry: (data: any) => Promise<void>;
  editSportEntry: (id: string, data: any) => Promise<void>;
  removeSportEntry: (id: string) => Promise<void>;

  // Finance actions
  fetchFinanceCards: () => Promise<void>;
  fetchFinanceTransactions: () => Promise<void>;
  addFinanceCard: (data: any) => Promise<void>;
  editFinanceCard: (id: string, data: any) => Promise<void>;
  removeFinanceCard: (id: string) => Promise<void>;
  addFinanceTransaction: (data: any) => Promise<void>;
  editFinanceTransaction: (id: string, data: any) => Promise<void>;
  removeFinanceTransaction: (id: string) => Promise<void>;

  // Life Tree actions
  fetchLifeTree: () => Promise<void>;
  addLifeTree: (data: any) => Promise<void>;
  editLifeTree: (id: string, data: any) => Promise<void>;
  removeLifeTree: (id: string) => Promise<void>;

  // Connection actions
  fetchConnections: () => Promise<void>;
  addConnection: (data: any) => Promise<void>;
  editConnection: (id: string, data: any) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;

  // Bulk fetch
  fetchAll: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  theme: loadTheme(),
  setTheme: (theme) => {
    saveTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'default' ? 'kawaii' : 'default';
    saveTheme(next);
    set({ theme: next });
  },

  currentPage: loadPage(),
  setPage: (page) => {
    savePage(page);
    set({ currentPage: page });
  },

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  deadlines: [],
  planner: [],
  journal: [],
  whiteboards: [],
  tables: [],
  sports: [],
  financeCards: [],
  financeTransactions: [],
  lifeTree: [],
  connections: [],
  notifications: [],
  loading: false,
  error: null,
  searchQuery: '',
  searchResults: null,
  showSearch: false,

  toast: null,
  showToast: (message, type = 'info') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 4000);
  },
  clearToast: () => set({ toast: null }),

  fetchDeadlines: async () => {
    try {
      const data = await api.getDeadlines();
      set({ deadlines: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchPlanner: async () => {
    try {
      const data = await api.getPlanner();
      set({ planner: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchJournal: async () => {
    try {
      const data = await api.getJournal();
      set({ journal: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchWhiteboards: async () => {
    try {
      const data = await api.getWhiteboards();
      set({ whiteboards: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchTables: async () => {
    try {
      const data = await api.getTables();
      set({ tables: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchNotifications: async () => {
    try {
      const data = await api.getNotifications();
      set({ notifications: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  search: async (q) => {
    try {
      const data = await api.search(q);
      set({ searchResults: data, searchQuery: q });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  toggleSearch: () => set((s) => ({ showSearch: !s.showSearch })),

  addDeadline: async (data) => {
    await api.createDeadline(data);
    await get().fetchDeadlines();
    get().showToast(t('deadline.created'), 'success');
  },

  editDeadline: async (id, data) => {
    await api.updateDeadline(id, data);
    await get().fetchDeadlines();
    get().showToast(t('deadline.updated'), 'success');
  },

  removeDeadline: async (id) => {
    await api.deleteDeadline(id);
    await get().fetchDeadlines();
    get().showToast(t('deadline.deleted'), 'success');
  },

  addPlannerEntry: async (data) => {
    await api.createPlannerEntry(data);
    await get().fetchPlanner();
    get().showToast(t('planner.entryAdded'), 'success');
  },

  editPlannerEntry: async (id, data) => {
    await api.updatePlannerEntry(id, data);
    await get().fetchPlanner();
    get().showToast(t('planner.entryUpdated'), 'success');
  },

  removePlannerEntry: async (id) => {
    await api.deletePlannerEntry(id);
    await get().fetchPlanner();
    get().showToast(t('planner.entryRemoved'), 'success');
  },

  addJournalEntry: async (data) => {
    await api.createJournalEntry(data);
    await get().fetchJournal();
    get().showToast(t('journal.saved'), 'success');
  },

  editJournalEntry: async (id, data) => {
    await api.updateJournalEntry(id, data);
    await get().fetchJournal();
    get().showToast(t('journal.updated'), 'success');
  },

  removeJournalEntry: async (id) => {
    await api.deleteJournalEntry(id);
    await get().fetchJournal();
    get().showToast(t('journal.deleted'), 'success');
  },

  addWhiteboard: async () => {
    const wb = await api.createWhiteboard();
    set((s) => ({ whiteboards: [...s.whiteboards, wb] }));
    get().showToast(t('boards.whiteboardCreated'), 'success');
    return wb.id;
  },

  removeWhiteboard: async (id) => {
    await api.deleteWhiteboard(id);
    set((s) => ({ whiteboards: s.whiteboards.filter((w) => w.id !== id) }));
    get().showToast(t('boards.whiteboardDeleted'), 'success');
  },

  saveWhiteboard: async (id, data) => {
    const updated = await api.updateWhiteboard(id, data);
    set((s) => ({
      whiteboards: s.whiteboards.map((w) => (w.id === id ? { ...w, ...updated } : w)),
    }));
  },

  addTable: async () => {
    const tbl = await api.createTable();
    set((s) => ({ tables: [...s.tables, tbl] }));
    get().showToast(t('boards.tableCreated'), 'success');
    return tbl.id;
  },

  removeTable: async (id) => {
    await api.deleteTable(id);
    set((s) => ({ tables: s.tables.filter((t) => t.id !== id) }));
    get().showToast(t('boards.tableDeleted'), 'success');
  },

  saveTable: async (id, data) => {
    const updated = await api.updateTable(id, data);
    set((s) => ({
      tables: s.tables.map((t) => (t.id === id ? { ...t, ...updated } : t)),
    }));
  },

  dismissNotification: async (id) => {
    await api.markRead(id);
    await get().fetchNotifications();
  },

  fetchSports: async () => {
    try {
      const data = await api.getSports();
      set({ sports: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  addSportEntry: async (data) => {
    await api.createSportEntry(data);
    await get().fetchSports();
    get().showToast(t('sports.entryAdded'), 'success');
  },

  editSportEntry: async (id, data) => {
    await api.updateSportEntry(id, data);
    await get().fetchSports();
    get().showToast(t('sports.entryUpdated'), 'success');
  },

  removeSportEntry: async (id) => {
    await api.deleteSportEntry(id);
    await get().fetchSports();
    get().showToast(t('sports.entryRemoved'), 'success');
  },

  fetchFinanceCards: async () => {
    try {
      const data = await api.getFinanceCards();
      set({ financeCards: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  fetchFinanceTransactions: async () => {
    try {
      const data = await api.getFinanceTransactions();
      set({ financeTransactions: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  addFinanceCard: async (data) => {
    await api.createFinanceCard(data);
    await get().fetchFinanceCards();
    get().showToast(t('finance.cardAdded'), 'success');
  },

  editFinanceCard: async (id, data) => {
    await api.updateFinanceCard(id, data);
    await get().fetchFinanceCards();
    get().showToast(t('finance.cardUpdated'), 'success');
  },

  removeFinanceCard: async (id) => {
    await api.deleteFinanceCard(id);
    await get().fetchFinanceCards();
    get().showToast(t('finance.cardRemoved'), 'success');
  },

  addFinanceTransaction: async (data) => {
    await api.createFinanceTransaction(data);
    await get().fetchFinanceTransactions();
    get().showToast(t('finance.transactionAdded'), 'success');
  },

  editFinanceTransaction: async (id, data) => {
    await api.updateFinanceTransaction(id, data);
    await get().fetchFinanceTransactions();
    get().showToast(t('finance.transactionUpdated'), 'success');
  },

  removeFinanceTransaction: async (id) => {
    await api.deleteFinanceTransaction(id);
    await get().fetchFinanceTransactions();
    get().showToast(t('finance.transactionRemoved'), 'success');
  },

  fetchLifeTree: async () => {
    try {
      const data = await api.getLifeTree();
      set({ lifeTree: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  addLifeTree: async (data) => {
    await api.createLifeTree(data);
    await get().fetchLifeTree();
    get().showToast(t('lifeTree.created'), 'success');
  },

  editLifeTree: async (id, data) => {
    await api.updateLifeTree(id, data);
    await get().fetchLifeTree();
    get().showToast(t('lifeTree.updated'), 'success');
  },

  removeLifeTree: async (id) => {
    await api.deleteLifeTree(id);
    await get().fetchLifeTree();
    get().showToast(t('lifeTree.removed'), 'success');
  },

  fetchConnections: async () => {
    try {
      const data = await api.getConnections();
      set({ connections: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  addConnection: async (data) => {
    try {
      await api.createConnection(data);
      await get().fetchConnections();
      get().showToast(t('connections.added'), 'success');
    } catch (e: any) {
      get().showToast(e?.message || 'Failed to add connection', 'error');
    }
  },

  editConnection: async (id, data) => {
    try {
      await api.updateConnection(id, data);
      await get().fetchConnections();
      get().showToast(t('connections.updated'), 'success');
    } catch (e: any) {
      get().showToast(e?.message || 'Failed to update connection', 'error');
    }
  },

  removeConnection: async (id) => {
    try {
      await api.deleteConnection(id);
      await get().fetchConnections();
      get().showToast(t('connections.removed'), 'success');
    } catch (e: any) {
      get().showToast(e?.message || 'Failed to delete connection', 'error');
    }
  },

  fetchAll: async () => {
    set({ loading: true, error: null });
    try {
      await Promise.all([
        get().fetchDeadlines(),
        get().fetchPlanner(),
        get().fetchJournal(),
        get().fetchWhiteboards(),
        get().fetchTables(),
        get().fetchSports(),
        get().fetchNotifications(),
        get().fetchFinanceCards(),
        get().fetchFinanceTransactions(),
        get().fetchLifeTree(),
        get().fetchConnections(),
      ]);
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },
}));
