export interface NodeLabel {
  value: string;
  label: string;
  color: string;
  icon: string;
  description: string;
}

export const NODE_LABELS: NodeLabel[] = [
  { value: 'friend', label: 'Friend', color: '#4ade80', icon: '👥', description: 'Personal friend' },
  { value: 'family', label: 'Family', color: '#f59e0b', icon: '👨‍👩‍👧', description: 'Family member' },
  { value: 'colleague', label: 'Colleague', color: '#a855f7', icon: '💼', description: 'Work colleague' },
  { value: 'mentor', label: 'Mentor', color: '#3b82f6', icon: '🧠', description: 'Mentor or advisor' },
  { value: 'student', label: 'Student', color: '#10b981', icon: '📚', description: 'Student or mentee' },
  { value: 'partner', label: 'Partner', color: '#ec4899', icon: '💕', description: 'Business or life partner' },
  { value: 'client', label: 'Client', color: '#f97316', icon: '🤝', description: 'Client or customer' },
  { value: 'investor', label: 'Investor', color: '#d97748', icon: '💰', description: 'Investor or backer' },
  { value: 'hospital', label: 'Hospital', color: '#ef4444', icon: '🏥', description: 'Hospital or clinic' },
  { value: 'business', label: 'Business', color: '#06b6d4', icon: '🏢', description: 'Business or company' },
  { value: 'university', label: 'University', color: '#4f46e5', icon: '🎓', description: 'University or school' },
  { value: 'company', label: 'Company', color: '#0d9488', icon: '🏢', description: 'Company or corporation' },
  { value: 'government', label: 'Government', color: '#6b7280', icon: '🏛️', description: 'Government entity' },
  { value: 'organization', label: 'Organization', color: '#84cc16', icon: '🏛️', description: 'Non-profit or org' },
  { value: 'other', label: 'Other', color: '#9ca3af', icon: '⭐', description: 'Other relationship' },
];

export function getLabelByValue(value: string): NodeLabel {
  return NODE_LABELS.find((l) => l.value === value) || NODE_LABELS[NODE_LABELS.length - 1];
}

export function resolveConnectionLabel(conn: { relationship?: string; label?: string | null }): NodeLabel {
  if (conn.label) {
    const found = NODE_LABELS.find((l) => l.label.toLowerCase() === conn.label!.toLowerCase() || l.value === conn.label);
    if (found) return found;
  }
  if (conn.relationship) {
    return getLabelByValue(conn.relationship);
  }
  return NODE_LABELS[NODE_LABELS.length - 1];
}

export function getConnectionColor(conn: { color?: string | null; relationship?: string; label?: string | null }): string {
  if (conn.color) return conn.color;
  return resolveConnectionLabel(conn).color;
}

export const PALETTE_COLORS: string[] = [
  '#4ade80', '#f59e0b', '#a855f7', '#3b82f6', '#10b981',
  '#ec4899', '#f97316', '#d97748', '#ef4444', '#06b6d4',
  '#4f46e5', '#0d9488', '#6b7280', '#84cc16', '#eab336',
  '#c2790f', '#8b5cf6', '#22d3ee', '#14b8a8', '#f43f5e',
];

export const EMOJI_OPTIONS: string[] = [
  '👤', '👥', '👨‍👩‍👧', '💼', '🎓', '🎨', '📝', '🔬', '🏥', '⚖️',
  '🎵', '🏆', '🌍', '💡', '❤️', '🚀', '💰', '🏛️', '🏢', '🌟',
  '👑', '🎯', '📊', '🔗', '🎪', '🎮', '📱', '💻', '🔧', '🎁',
];
