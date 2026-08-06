export interface Task {
  id: string;
  title: string;
  description: string;
  time: string;
  done: boolean;
}

export interface Deadline {
  id: string;
  title: string;
  description: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  tasks: Task[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  progress: number;
  reminder_enabled: boolean;
  reminded_3d: boolean;
  reminded_2d: boolean;
  reminded_1d: boolean;
  reminded_1h: boolean;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export type TimeBlockTag = 'workout' | 'language' | 'work' | 'university' | 'personal_business' | 'research';

export const TIME_BLOCK_TAGS: { value: TimeBlockTag; label: string; color: string }[] = [
  { value: 'workout', label: 'Workout', color: 'bg-green-500/20 text-green-400' },
  { value: 'language', label: 'Language', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'work', label: 'Work', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'university', label: 'University', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'personal_business', label: 'Personal Biz', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'research', label: 'Research', color: 'bg-rose-500/20 text-rose-400' },
];

export interface TimeBlock {
  id: string;
  title: string;
  description: string;
  time: string;
  completed_time: string | null;
  done: boolean;
  is_work?: boolean;
  tag?: TimeBlockTag;
}

export interface PlannerEntry {
  id: string;
  date: string;
  day: string;
  time_blocks: TimeBlock[];
  notes: string;
  tasks: string[];
  mood: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  what_i_did: string;
  plans: string;
  reflection: string;
  mood: string;
  is_markdown: boolean;
  created_at: string;
  updated_at: string;
}

export interface TableData {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
  created_at: string;
  updated_at: string;
}

export interface Whiteboard {
  id: string;
  title: string;
  content: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  title: string;
  type: string;
  timestamp: string;
  read: boolean;
}

export interface DashboardStats {
  total_deadlines: number;
  overdue: number;
  due_soon: number;
  completed_today: number;
  long_term_goals: number;
  short_term_goals: number;
  weekly_progress: number;
  upcoming_deadlines: Deadline[];
  weekly_entries: PlannerEntry[];
}

export interface DailyTask {
  task: string;
  hours: number;
  is_study?: boolean;
}

export interface DailyActivity {
  id: string;
  date: string;
  entries: DailyTask[];
  total_hours: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ReportDay {
  date: string;
  planner: PlannerEntry | null;
  journal: JournalEntry | null;
  activity: DailyActivity | null;
  planned_tasks: any[];
  done_tasks: any[];
  not_done_tasks: any[];
  activity_tasks: DailyTask[];
  planner_total_hours: number;
  activity_total_hours: number;
  day_total_hours: number;
  notes: { id: string; title: string; category: string }[];
  deadline_tasks: { done: { deadline_title: string; task_text: string }[]; not_done: { deadline_title: string; task_text: string }[] };
}

export interface ReportWeek {
  week_start: string;
  days: ReportDay[];
  total_hours: number;
  days_count: number;
}

export interface ReportMonth {
  month: string;
  days: ReportDay[];
  total_hours: number;
  days_count: number;
}

export interface Report {
  start_date: string;
  end_date: string;
  days: ReportDay[];
  total_hours: number;
  total_days: number;
  weeks: ReportWeek[];
  months: ReportMonth[];
}

export interface DailyTaskSummary {
  title: string;
  done: boolean;
  source: string;
  hours: number;
}

export interface DailySummary {
  id: string;
  date: string;
  done_tasks: DailyTaskSummary[];
  not_done_tasks: DailyTaskSummary[];
  notes: string[];
  journal_what_i_did: string;
  total_hours: number;
  summary_text: string;
  created_at: string;
  updated_at: string;
}

export interface SportExercise {
  id: string;
  name: string;
  duration: number;
  intensity: string;
  done: boolean;
  scheduled_time?: string;
}

export interface SportEntry {
  id: string;
  date: string;
  exercises: SportExercise[];
  total_duration: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Habit {
  id: string;
  text: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceCard {
  id: string;
  nickname: string;
  card_number: string;
  cvv2: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: string;
  date: string;
  card_id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export const TRANSACTION_CATEGORIES = [
  'fun', 'work', 'food', 'transport', 'bills',
  'shopping', 'health', 'education', 'other',
] as const;

export interface TreeBranch {
  id: string;
  title: string;
  description: string;
  done: boolean;
  children: TreeBranch[];
}

export interface LifeTreeEntry {
  id: string;
  title: string;
  description: string;
  branches: TreeBranch[];
  created_at: string;
  updated_at: string;
}

export interface Connection {
  id: string;
  name: string;
  relationship: string;
  label?: string | null;
  description: string;
  emoji: string;
  icon?: string | null;
  color?: string | null;
  tags: string[];
  parent_id?: string | null;
  x?: number | null;
  y?: number | null;
  created_at: string;
  updated_at: string;
}

export type Page = 
  | 'dashboard'
  | 'deadlines'
  | 'planner'
  | 'journal'
  | 'boards'
  | 'settings'
  | 'reports'
  | 'sports'
  | 'finance'
  | 'life-tree'
  | 'connections';

