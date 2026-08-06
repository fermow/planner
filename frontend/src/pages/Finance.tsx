import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, X, Wallet, TrendingUp, TrendingDown, CreditCard,
  Trash2, Edit3, ChevronLeft, ChevronRight, Eye, EyeOff,
  PiggyBank, BarChart3, Receipt, Calendar,
} from 'lucide-react';
import { useTranslation } from '../i18n/t';
import { useStore } from '../store/useStore';
import type { FinanceCard, FinanceTransaction } from '../types';
import { TRANSACTION_CATEGORIES } from '../types';
import { formatMoney, formatDateMonth } from '../utils/formatTime';

const todayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const localMonthStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};


const CATEGORY_COLORS: Record<string, string> = {
  fun: 'bg-cosmic-rose/20 text-cosmic-rose',
  work: 'bg-cosmic-cyan/20 text-cosmic-cyan',
  food: 'bg-cosmic-gold/20 text-cosmic-gold',
  transport: 'bg-cosmic-violet/20 text-cosmic-violet',
  bills: 'bg-red-500/20 text-red-400',
  shopping: 'bg-pink-500/20 text-pink-400',
  health: 'bg-green-500/20 text-green-400',
  education: 'bg-blue-500/20 text-blue-400',
  other: 'bg-white/10 text-navy-200',
};

const CATEGORY_LABELS: Record<string, string> = {
  fun: 'finance.categoryFun',
  work: 'finance.categoryWork',
  food: 'finance.categoryFood',
  transport: 'finance.categoryTransport',
  bills: 'finance.categoryBills',
  shopping: 'finance.categoryShopping',
  health: 'finance.categoryHealth',
  education: 'finance.categoryEducation',
  other: 'finance.categoryOther',
};

export default function FinancePage() {
  const { t } = useTranslation();
  const {
    financeCards, financeTransactions,
    fetchFinanceCards, fetchFinanceTransactions,
    addFinanceCard, editFinanceCard, removeFinanceCard,
    addFinanceTransaction, editFinanceTransaction, removeFinanceTransaction,
    showToast,
  } = useStore();

  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedCardId, setSelectedCardId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Card modal
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<FinanceCard | null>(null);
  const [cardForm, setCardForm] = useState({ nickname: '', card_number: '', cvv2: '', expiry_date: '' });
  const [showCVV, setShowCVV] = useState(false);
  const [showCardNum, setShowCardNum] = useState(false);

  // Transaction modal
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState<FinanceTransaction | null>(null);
  const [txForm, setTxForm] = useState({
    date: todayStr(), card_id: '', type: 'expense' as 'income' | 'expense',
    amount: 0, category: 'other', description: '',
  });
  const [dollarRate, setDollarRate] = useState<number | null>(null);
  const [amountText, setAmountText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/finance/rate');
        if (!res.ok) throw new Error('Rate fetch failed');
        const data = await res.json();
        if (data.rate) setDollarRate(data.rate);
      } catch (e) {
        console.error('Rate fetch error:', e);
      }
    })();
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/finance/rate');
        if (!res.ok) throw new Error('Rate fetch failed');
        const data = await res.json();
        if (data.rate) setDollarRate(data.rate);
      } catch (e) {
        console.error('Rate fetch error:', e);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const toUSD = (n: number) => dollarRate ? (n * 10 / dollarRate) : null;
  const usdLabel = (n: number) => {
    const usd = toUSD(n);
    return usd !== null ? `≈ $${usd.toFixed(2)}` : '';
  };

  const allCardBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    financeCards.forEach((c) => { balances[c.id] = 0; });
    financeTransactions.forEach((tx) => {
      if (balances[tx.card_id] !== undefined) {
        balances[tx.card_id] += tx.type === 'income' ? tx.amount : -tx.amount;
      }
    });
    return balances;
  }, [financeCards, financeTransactions]);

  useEffect(() => {
    fetchFinanceCards();
    fetchFinanceTransactions();
  }, [fetchFinanceCards, fetchFinanceTransactions]);

  // ─── Computed data ───
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);

  const monthTransactions = useMemo(() => {
    const monthStr = localMonthStr(currentMonth);
    return financeTransactions.filter((t) => t.date.startsWith(monthStr));
  }, [financeTransactions, currentMonth]);

  const totalIncome = useMemo(() =>
    monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
  [monthTransactions]);

  const totalExpense = useMemo(() =>
    monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  [monthTransactions]);

  const balance = totalIncome - totalExpense;

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    monthTransactions.filter((t) => t.type === 'expense').forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return map;
  }, [monthTransactions]);

  const filteredTransactions = useMemo(() => {
    let list = monthTransactions;
    if (selectedCardId !== 'all') {
      const card = financeCards.find((c) => c.id === selectedCardId);
      list = list.filter((t) => t.card_id === selectedCardId);
    }
    if (selectedCategory !== 'all') {
      list = list.filter((t) => t.category === selectedCategory);
    }
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [monthTransactions, selectedCardId, selectedCategory, financeCards]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

  const chartData = useMemo(() => {
    const days: { day: number; income: number; expense: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${localMonthStr(currentMonth)}-${String(d).padStart(2, '0')}`;
      const dayTxs = monthTransactions.filter((t) => t.date === dateStr);
      days.push({
        day: d,
        income: dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      });
    }
    return days;
  }, [monthTransactions, currentMonth, daysInMonth]);

  const maxChartVal = Math.max(...chartData.map((d) => Math.max(d.income, d.expense)), 1);

  // ─── Card handlers ───
  function openCardModal(card?: FinanceCard) {
    if (card) {
      setEditingCard(card);
      setCardForm({ nickname: card.nickname, card_number: card.card_number, cvv2: card.cvv2, expiry_date: card.expiry_date });
    } else {
      setEditingCard(null);
      setCardForm({ nickname: '', card_number: '', cvv2: '', expiry_date: '' });
    }
    setShowCardModal(true);
  }

  async function saveCard() {
    if (!cardForm.nickname || !cardForm.card_number || !cardForm.cvv2 || !cardForm.expiry_date) {
      showToast('Please fill all card fields', 'error');
      return;
    }
    if (editingCard) {
      await editFinanceCard(editingCard.id, cardForm);
    } else {
      await addFinanceCard(cardForm);
    }
    setShowCardModal(false);
  }

  // ─── Transaction handlers ───
  function openTxModal(tx?: FinanceTransaction) {
    if (tx) {
      setEditingTx(tx);
      const card = financeCards.find((c) => c.id === tx.card_id);
      setTxForm({
        date: tx.date, card_id: tx.card_id,
        type: tx.type, amount: tx.amount,
        category: tx.category, description: tx.description,
      });
      setAmountText(formatMoney(tx.amount));
    } else {
      setEditingTx(null);
      setTxForm({
        date: todayStr(), card_id: financeCards[0]?.id || '',
        type: 'expense', amount: 0, category: 'other', description: '',
      });
      setAmountText('');
    }
    setShowTxModal(true);
  }

  async function saveTx() {
    if (!txForm.card_id || txForm.amount <= 0) {
      showToast('Please select a card and enter a valid amount', 'error');
      return;
    }
    if (editingTx) {
      await editFinanceTransaction(editingTx.id, txForm);
    } else {
      await addFinanceTransaction(txForm);
    }
    setShowTxModal(false);
  }

  const selectedCard = financeCards.find((c) => c.id === selectedCardId);

  // Chart SVG dimensions
  const chartW = Math.max(daysInMonth * 12, 300);
  const chartH = 160;
  const padL = 30;
  const padR = 10;
  const padT = 20;
  const padB = 25;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  function xPos(i: number) { return padL + (i / (daysInMonth - 1 || 1)) * plotW; }
  function yPos(val: number) { return padT + plotH - (val / maxChartVal) * plotH; }

  const incomeLine = chartData.map((d, i) => `${xPos(i)},${yPos(d.income)}`).join(' ');
  const expenseLine = chartData.map((d, i) => `${xPos(i)},${yPos(d.expense)}`).join(' ');

  const incomeArea = `${padL},${padT + plotH} ${incomeLine} ${xPos(daysInMonth - 1)},${padT + plotH}`;
  const expenseArea = `${padL},${padT + plotH} ${expenseLine} ${xPos(daysInMonth - 1)},${padT + plotH}`;

  return (
    <div className="space-y-5 w-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-xl md:text-2xl font-display text-white flex items-center gap-2">
            <Wallet size={22} className="text-cosmic-gold" />
            {t('finance.title')}
          </h2>
          <p className="text-sm text-navy-200/60">
            {formatDateMonth(currentMonth)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openTxModal()} className="celestial-btn celestial-btn-primary text-xs flex items-center gap-1.5">
            <Plus size={14} /> {t('finance.transaction')}
          </button>
        </div>
      </motion.div>

      {/* ─── Summary cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 text-center"
        >
          <TrendingUp size={18} className="text-cosmic-cyan mx-auto mb-1" />
          <div className="text-lg md:text-2xl font-bold text-cosmic-cyan">
            {formatMoney(totalIncome)}
          </div>
          <div className="text-xs text-navy-300/40">{usdLabel(totalIncome)}</div>
          <div className="text-[10px] text-navy-200/60">{t('finance.income')}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card p-4 text-center"
        >
          <TrendingDown size={18} className="text-cosmic-rose mx-auto mb-1" />
          <div className="text-lg md:text-2xl font-bold text-cosmic-rose">
            {formatMoney(totalExpense)}
          </div>
          <div className="text-xs text-navy-300/40">{usdLabel(totalExpense)}</div>
          <div className="text-[10px] text-navy-200/60">{t('finance.expenses')}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-4 text-center"
        >
          <PiggyBank size={18} className={`mx-auto mb-1 ${balance >= 0 ? 'text-green-400' : 'text-cosmic-rose'}`} />
          <div className={`text-lg md:text-2xl font-bold ${balance >= 0 ? 'text-green-400' : 'text-cosmic-rose'}`}>
            {formatMoney(balance)}
          </div>
          <div className="text-xs text-navy-300/40">{usdLabel(balance)}</div>
          <div className="text-[10px] text-navy-200/60">{t('finance.balance')}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass-card p-4 text-center"
        >
          <CreditCard size={18} className="text-cosmic-gold mx-auto mb-1" />
          <div className="text-lg md:text-2xl font-bold text-cosmic-gold">{financeCards.length}</div>
          <div className="text-[10px] text-navy-200/60">{t('finance.cards')}</div>
        </motion.div>
      </div>

      {/* ─── Cards row ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin -mx-3 md:mx-0 px-3 md:px-0">
        {financeCards.map((card) => {
          const cardBalance = allCardBalances[card.id] || 0;
          const statusDot = cardBalance > 0 ? 'bg-green-400' : cardBalance < 0 ? 'bg-cosmic-rose' : 'bg-navy-400';
          const balanceColor = cardBalance > 0 ? 'text-green-400' : cardBalance < 0 ? 'text-cosmic-rose' : 'text-navy-300/60';
          return (
          <motion.button key={card.id} whileTap={{ scale: 0.97 }}
            onClick={() => setSelectedCardId(card.id)}
            className={`glass-card p-3 shrink-0 text-left transition-all min-w-[180px] ${
              selectedCardId === card.id ? 'border-cosmic-cyan/40 ring-1 ring-cosmic-cyan/20' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-white flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                {card.nickname}
              </span>
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); openCardModal(card); }}
                  className="text-navy-300/40 hover:text-cosmic-cyan transition-colors">
                  <Edit3 size={10} />
                </button>
                <button onClick={async (e) => { e.stopPropagation(); await removeFinanceCard(card.id); }}
                  className="text-navy-300/40 hover:text-cosmic-rose transition-colors">
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
            <div className="text-[10px] text-navy-200/60 font-mono">
              <div className="flex items-center gap-1">
                <span>{showCardNum ? card.card_number : `****${card.card_number.slice(-4)}`}</span>
                <button onClick={(e) => { e.stopPropagation(); setShowCardNum(!showCardNum); }}
                  className="text-navy-300/30 hover:text-navy-200">
                  {showCardNum ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span>CVV: {showCVV ? card.cvv2 : '***'}</span>
                <button onClick={(e) => { e.stopPropagation(); setShowCVV(!showCVV); }}
                  className="text-navy-300/30 hover:text-navy-200">
                  {showCVV ? <EyeOff size={10} /> : <Eye size={10} />}
                </button>
              </div>
              <span>Exp: {card.expiry_date}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-white/5">
              <span className="text-[10px] text-navy-300/60">{t('finance.balance')}</span>
              <span className={`text-[10px] font-semibold ${balanceColor}`}>
                {formatMoney(cardBalance)}
              </span>
            </div>
          </motion.button>
          );
        })}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => openCardModal()}
          className="glass-card p-3 shrink-0 flex items-center gap-2 text-navy-300/60 hover:text-white transition-all min-w-[120px]"
        >
          <Plus size={16} />
          <span className="text-xs">{t('finance.addCard')}</span>
        </motion.button>
      </div>

      {/* ─── Chart ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 size={14} className="text-cosmic-cyan" />
            {formatDateMonth(currentMonth)}
            {dollarRate && (
              <span className="text-xs text-navy-300/40 font-normal">{t('finance.exchangeRate', { rate: formatMoney(dollarRate) })}</span>
            )}
          </h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-navy-200/60">{t('finance.incomeLegend')}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="w-2 h-2 rounded-full bg-cosmic-rose" />
              <span className="text-navy-200/60">{t('finance.expenseLegend')}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMonthOffset((o) => o - 1)} className="p-1 rounded hover:bg-white/5 text-navy-200"><ChevronLeft size={14} /></button>
              <button onClick={() => setMonthOffset(0)} className="text-[10px] text-navy-300/60 hover:text-white">{t('finance.today')}</button>
              <button onClick={() => setMonthOffset((o) => o + 1)} className="p-1 rounded hover:bg-white/5 text-navy-200"><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto -mx-3 md:mx-0 pb-2 px-3 md:px-0">
          <svg width={chartW} height={chartH + 10} viewBox={`0 0 ${chartW} ${chartH + 10}`} className="min-w-[300px]">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = yPos(maxChartVal * ratio);
              return (
                <g key={ratio}>
                  <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                  <text x={padL - 4} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={8}>
                    {Math.round(maxChartVal * (1 - ratio)).toLocaleString()}
                  </text>
                </g>
              );
            })}
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e040a0" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#e040a0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <polygon points={incomeArea} fill="url(#incomeGrad)" opacity={0.3} />
            <polygon points={expenseArea} fill="url(#expenseGrad)" opacity={0.3} />
            <polyline points={incomeLine} fill="none" stroke="#4ade80" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={expenseLine} fill="none" stroke="#e040a0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {chartData.map((d, i) => {
              const cx = xPos(i);
              const isToday = d.day === now.getDate() && monthOffset === 0;
              return (
                <g key={d.day}>
                  <circle cx={cx} cy={yPos(d.income)} r={d.income > 0 ? 3 : 1.5} fill={d.income > 0 ? '#4ade80' : 'rgba(255,255,255,0.1)'}
                    stroke={isToday ? '#22d3ee' : 'none'} strokeWidth={isToday ? 2 : 0} />
                  <circle cx={cx} cy={yPos(d.expense)} r={d.expense > 0 ? 3 : 1.5} fill={d.expense > 0 ? '#e040a0' : 'rgba(255,255,255,0.1)'}
                    stroke={isToday ? '#22d3ee' : 'none'} strokeWidth={isToday ? 2 : 0} />
                  <text x={cx} y={chartH - 2} textAnchor="middle" fill={isToday ? '#22d3ee' : 'rgba(255,255,255,0.2)'} fontSize={7}>{d.day}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </motion.div>

      {/* ─── Category breakdown + Filters ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Category breakdown */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Receipt size={14} className="text-cosmic-gold" />
            {t('finance.spendingByCategory')}
          </h3>
          <div className="space-y-2">
            {TRANSACTION_CATEGORIES.filter((c) => categoryTotals[c]).length === 0 && (
              <p className="text-xs text-navy-200/40 text-center py-4">{t('finance.noExpenses')}</p>
            )}
            {TRANSACTION_CATEGORIES.map((cat) => {
              const val = categoryTotals[cat] || 0;
              const pct = totalExpense > 0 ? (val / totalExpense) * 100 : 0;
              if (val === 0) return null;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className={`px-2 py-0.5 rounded-full ${CATEGORY_COLORS[cat] || 'bg-white/10 text-navy-200'}`}>
                      {t(CATEGORY_LABELS[cat] || cat)}
                    </span>
                    <span className="text-navy-200">{formatMoney(val)} <span className="text-navy-300/40">({pct.toFixed(0)}%)</span>
                      {dollarRate && <span className="text-xs text-navy-300/30 ml-1">{usdLabel(val)}</span>}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cosmic-cyan to-cosmic-gold transition-all"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* All-time summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card p-4"
        >
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <PiggyBank size={14} className="text-cosmic-cyan" />
            {t('finance.allTimeSummary')}
          </h3>
          {(() => {
            const allIncome = financeTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const allExpense = financeTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const allBalance = allIncome - allExpense;
            return (
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${allBalance >= 0 ? 'text-green-400' : 'text-cosmic-rose'}`}>
                    {formatMoney(allBalance)}
                  </div>
                  <div className="text-xs text-navy-300/40">{usdLabel(allBalance)}</div>
                  <div className="text-[10px] text-navy-200/60">{t('finance.totalBalance')}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <div className="text-sm font-bold text-cosmic-cyan">{formatMoney(allIncome)}</div>
                    <div className="text-xs text-navy-300/40">{usdLabel(allIncome)}</div>
                    <div className="text-[9px] text-navy-200/40">{t('finance.totalIncome')}</div>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <div className="text-sm font-bold text-cosmic-rose">{formatMoney(allExpense)}</div>
                    <div className="text-xs text-navy-300/40">{usdLabel(allExpense)}</div>
                    <div className="text-[9px] text-navy-200/40">{t('finance.totalExpenses')}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <div className="text-sm font-bold text-white">{financeCards.length}</div>
                    <div className="text-[9px] text-navy-200/40">{t('finance.cards')}</div>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <div className="text-sm font-bold text-white">{financeTransactions.length}</div>
                    <div className="text-[9px] text-navy-200/40">{t('finance.transactions')}</div>
                  </div>
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* Quick filters */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-4"
        >
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-cosmic-gold" />
{t('finance.filters')}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">Card</label>
              <select value={selectedCardId} onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="all">{t('finance.allCards')}</option>
                {financeCards.map((c) => (
                  <option key={c.id} value={c.id}>{c.nickname}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('finance.category')}</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="all">{t('finance.allCategories')}</option>
                {TRANSACTION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{t(CATEGORY_LABELS[cat])}</option>
                ))}
              </select>
            </div>
            <button onClick={() => openTxModal()}
              className="w-full celestial-btn celestial-btn-primary text-xs mt-2"
            >
              <Plus size={12} className="inline mr-1" /> {t('finance.addTransaction')}
            </button>
          </div>
        </motion.div>
      </div>

      {/* ─── Transactions table ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4"
      >
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Receipt size={14} className="text-cosmic-cyan" />
          {t('finance.transactions')}
          <span className="text-navy-300/40 font-normal text-xs">({filteredTransactions.length})</span>
        </h3>
        {filteredTransactions.length === 0 ? (
          <p className="text-sm text-navy-200/40 text-center py-6">{t('finance.noTransactions')}</p>
        ) : (
          <div className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0">
            <table className="w-full text-xs md:text-sm min-w-[500px] md:min-w-0">
              <thead>
                <tr className="text-left text-[9px] md:text-[10px] uppercase tracking-wider text-navy-300/50 border-b border-white/5">
                  <th className="pb-2 pr-2 md:pr-3">{t('finance.tableDate')}</th>
                  <th className="pb-2 pr-2 md:pr-3">{t('finance.tableCard')}</th>
                  <th className="pb-2 pr-2 md:pr-3">{t('finance.tableCategory')}</th>
                  <th className="pb-2 pr-2 md:pr-3">{t('finance.tableDescription')}</th>
                  <th className="pb-2 pr-2 md:pr-3 text-right">{t('finance.tableAmount')}</th>
                  <th className="pb-2 pr-2 md:pr-3 text-right">{t('finance.tableActions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => {
                  const card = financeCards.find((c) => c.id === tx.card_id);
                  return (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-2 pr-2 md:py-2.5 md:pr-3 text-navy-200/60 whitespace-nowrap">{tx.date}</td>
                      <td className="py-2 pr-2 md:py-2.5 md:pr-3">
                        <span className="text-navy-100">{card?.nickname || 'Unknown'}</span>
                      </td>
                      <td className="py-2 pr-2 md:py-2.5 md:pr-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[tx.category] || 'bg-white/10 text-navy-200'}`}>
                          {CATEGORY_LABELS[tx.category] || tx.category}
                        </span>
                      </td>
                      <td className="py-2 pr-2 md:py-2.5 md:pr-3 text-navy-200/60 max-w-[150px] truncate">{tx.description || '—'}</td>
                      <td className={`py-2 pr-2 md:py-2.5 md:pr-3 text-right whitespace-nowrap ${
                        tx.type === 'income' ? 'text-green-400' : 'text-cosmic-rose'
                      }`}>
                        <div>{tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}</div>
                        {dollarRate && <div className="text-xs text-navy-300/40">{usdLabel(tx.amount)}</div>}
                      </td>
                      <td className="py-2 pr-2 md:py-2.5 md:pr-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openTxModal(tx)}
                            className="p-1 rounded hover:bg-white/5 text-navy-300/40 hover:text-cosmic-cyan transition-colors">
                            <Edit3 size={12} />
                          </button>
                          <button onClick={async () => { await removeFinanceTransaction(tx.id); }}
                            className="p-1 rounded hover:bg-white/5 text-navy-300/40 hover:text-cosmic-rose transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ─── Card Modal ─── */}
      <AnimatePresence>
        {showCardModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] pb-8 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCardModal(false)}
          >
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-5 w-full max-w-md mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display text-white flex items-center gap-2">
                  <CreditCard size={16} className="text-cosmic-gold" />
                  {editingCard ? t('finance.editCard') : t('finance.addCardTitle')}
                </h3>
                <button onClick={() => setShowCardModal(false)} className="p-1.5 rounded hover:bg-white/5 text-navy-300">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('finance.nickname')}</label>
                  <input type="text" value={cardForm.nickname} onChange={(e) => setCardForm({ ...cardForm, nickname: e.target.value })}
                    placeholder={t('finance.nicknamePlaceholder')} className="celestial-input text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('finance.cardNumber')}</label>
                  <input type="text" value={cardForm.card_number} onChange={(e) => setCardForm({ ...cardForm, card_number: e.target.value })}
                    placeholder={t('finance.cardNumberPlaceholder')} className="celestial-input text-sm font-mono" maxLength={19} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('finance.cvv2')}</label>
                    <input type="text" value={cardForm.cvv2} onChange={(e) => setCardForm({ ...cardForm, cvv2: e.target.value })}
                      placeholder={t('finance.cvv2Placeholder')} className="celestial-input text-sm font-mono" maxLength={4} />
                  </div>
                  <div>
                    <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('finance.expiryDate')}</label>
                    <input type="text" value={cardForm.expiry_date} onChange={(e) => setCardForm({ ...cardForm, expiry_date: e.target.value })}
                      placeholder={t('finance.expiryPlaceholder')} className="celestial-input text-sm font-mono" maxLength={5} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-5 pt-4 border-t border-white/5">
                <button onClick={saveCard} className="celestial-btn celestial-btn-primary flex-1 text-sm">
                  {editingCard ? t('finance.updateCard') : t('finance.addCardBtn')}
                </button>
                <button onClick={() => setShowCardModal(false)} className="celestial-btn celestial-btn-secondary text-sm">
                  {t('finance.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Transaction Modal ─── */}
      <AnimatePresence>
        {showTxModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] pb-8 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTxModal(false)}
          >
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-5 w-full max-w-md mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display text-white flex items-center gap-2">
                  <Receipt size={16} className="text-cosmic-gold" />
                  {editingTx ? t('finance.editTransaction') : t('finance.addTransactionTitle')}
                </h3>
                <button onClick={() => setShowTxModal(false)} className="p-1.5 rounded hover:bg-white/5 text-navy-300">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setTxForm({ ...txForm, type: 'income' })}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${
                      txForm.type === 'income' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-navy-200/60 hover:text-white'
                    }`}
                  >
                    <TrendingUp size={14} className="inline mr-1" /> {t('finance.income')}
                  </button>
                  <button onClick={() => setTxForm({ ...txForm, type: 'expense' })}
                    className={`p-2 rounded-lg text-xs font-medium transition-all ${
                      txForm.type === 'expense' ? 'bg-cosmic-rose/20 text-cosmic-rose border border-cosmic-rose/30' : 'bg-white/5 text-navy-200/60 hover:text-white'
                    }`}
                  >
                    <TrendingDown size={14} className="inline mr-1" /> {t('finance.expenses')}
                  </button>
                </div>
                <div>
<label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('finance.card')}</label>
                  <select value={txForm.card_id} onChange={(e) => setTxForm({ ...txForm, card_id: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">{t('finance.selectCard')}</option>
                    {financeCards.map((c) => (
                      <option key={c.id} value={c.id}>{c.nickname}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('finance.amount')}</label>
                  <input type="text" value={amountText}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (/^\d*\.?\d*$/.test(raw) || raw === '') {
                        setAmountText(raw);
                        setTxForm({ ...txForm, amount: raw ? parseFloat(raw) : 0 });
                      }
                    }}
                    onBlur={() => {
                      if (txForm.amount) setAmountText(formatMoney(txForm.amount));
                    }}
                    onFocus={() => {
                      if (txForm.amount) setAmountText(String(txForm.amount));
                    }}
                    placeholder={t('finance.amountPlaceholder')} className="celestial-input text-sm font-mono text-left" />
                </div>
                <div>
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('finance.selectCategory')}</label>
                  <select value={txForm.category} onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {TRANSACTION_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{t(CATEGORY_LABELS[cat])}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('finance.date')}</label>
                  <input type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    className="celestial-input text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-navy-200/60 uppercase tracking-wider block mb-1">{t('finance.descriptionField')}</label>
                  <input type="text" value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                    placeholder={t('finance.descriptionPlaceholder')} className="celestial-input text-sm" />
                </div>
              </div>
              <div className="flex gap-2 mt-5 pt-4 border-t border-white/5">
                <button onClick={saveTx} className="celestial-btn celestial-btn-primary flex-1 text-sm">
                  {editingTx ? t('finance.updateTransaction') : t('finance.addTransactionBtn')}
                </button>
                <button onClick={() => setShowTxModal(false)} className="celestial-btn celestial-btn-secondary text-sm">
                  {t('finance.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
