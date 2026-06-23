const STORAGE_KEY = 'subs-tracker-v1';

const CATEGORY_ICONS = {
  entertainment: '🎬',
  music: '🎵',
  productivity: '💼',
  fitness: '💪',
  cloud: '☁️',
  news: '📰',
  other: '📦',
};

const els = {
  list: document.getElementById('subscriptionList'),
  empty: document.getElementById('emptyState'),
  monthlyTotal: document.getElementById('monthlyTotal'),
  activeCount: document.getElementById('activeCount'),
  upcomingCount: document.getElementById('upcomingCount'),
  yearlyTotal: document.getElementById('yearlyTotal'),
  modal: document.getElementById('modal'),
  form: document.getElementById('form'),
  modalTitle: document.getElementById('modalTitle'),
  deleteBtn: document.getElementById('deleteBtn'),
  addBtn: document.getElementById('addBtn'),
  closeBtn: document.getElementById('closeBtn'),
  name: document.getElementById('name'),
  amount: document.getElementById('amount'),
  cycle: document.getElementById('cycle'),
  nextDate: document.getElementById('nextDate'),
  category: document.getElementById('category'),
};

let subscriptions = load();
let editingId = null;

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

function monthlyEquivalent(amount, cycle) {
  if (cycle === 'weekly') return amount * (52 / 12);
  if (cycle === 'yearly') return amount / 12;
  return amount;
}

function formatMoney(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysUntil(iso) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + 'T12:00:00');
  return Math.round((target - today) / 86400000);
}

function cycleLabel(cycle) {
  return { weekly: '/wk', monthly: '/mo', yearly: '/yr' }[cycle];
}

function render() {
  const monthly = subscriptions.reduce((sum, s) => sum + monthlyEquivalent(s.amount, s.cycle), 0);
  const yearly = monthly * 12;
  const upcoming = subscriptions.filter(s => {
    const d = daysUntil(s.nextDate);
    return d >= 0 && d <= 7;
  }).length;

  els.monthlyTotal.textContent = `${formatMoney(monthly)} / month`;
  els.activeCount.textContent = subscriptions.length;
  els.upcomingCount.textContent = upcoming;
  els.yearlyTotal.textContent = formatMoney(yearly);

  els.empty.classList.toggle('hidden', subscriptions.length > 0);
  els.list.innerHTML = '';

  const sorted = [...subscriptions].sort((a, b) => a.nextDate.localeCompare(b.nextDate));

  for (const sub of sorted) {
    const days = daysUntil(sub.nextDate);
    const soon = days >= 0 && days <= 7;
    const card = document.createElement('article');
    card.className = 'sub-card' + (soon ? ' sub-soon' : '');
    card.innerHTML = `
      <div class="sub-icon">${CATEGORY_ICONS[sub.category] || '📦'}</div>
      <div class="sub-info">
        <div class="sub-name">${escapeHtml(sub.name)}</div>
        <div class="sub-meta">${soon ? (days === 0 ? 'Renews today' : `Renews in ${days}d`) : `Next: ${formatDate(sub.nextDate)}`}</div>
      </div>
      <div class="sub-amount">
        <div class="sub-price">${formatMoney(sub.amount)}</div>
        <div class="sub-cycle">${cycleLabel(sub.cycle)}</div>
      </div>
    `;
    card.addEventListener('click', () => openEdit(sub.id));
    els.list.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function openAdd() {
  editingId = null;
  els.modalTitle.textContent = 'Add Subscription';
  els.deleteBtn.hidden = true;
  els.form.reset();
  els.nextDate.value = new Date().toISOString().slice(0, 10);
  els.modal.showModal();
  setTimeout(() => els.name.focus(), 100);
}

function openEdit(id) {
  const sub = subscriptions.find(s => s.id === id);
  if (!sub) return;
  editingId = id;
  els.modalTitle.textContent = 'Edit Subscription';
  els.deleteBtn.hidden = false;
  els.name.value = sub.name;
  els.amount.value = sub.amount;
  els.cycle.value = sub.cycle;
  els.nextDate.value = sub.nextDate;
  els.category.value = sub.category;
  els.modal.showModal();
}

function closeModal() {
  els.modal.close();
  editingId = null;
}

els.addBtn.addEventListener('click', openAdd);
els.closeBtn.addEventListener('click', closeModal);

els.modal.addEventListener('click', (e) => {
  if (e.target === els.modal) closeModal();
});

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    name: els.name.value.trim(),
    amount: parseFloat(els.amount.value),
    cycle: els.cycle.value,
    nextDate: els.nextDate.value,
    category: els.category.value,
  };

  if (editingId) {
    const idx = subscriptions.findIndex(s => s.id === editingId);
    if (idx >= 0) subscriptions[idx] = { ...subscriptions[idx], ...data };
  } else {
    subscriptions.push({ id: crypto.randomUUID(), ...data });
  }

  save();
  render();
  closeModal();
});

els.deleteBtn.addEventListener('click', () => {
  if (!editingId) return;
  if (confirm('Delete this subscription?')) {
    subscriptions = subscriptions.filter(s => s.id !== editingId);
    save();
    render();
    closeModal();
  }
});

render();
