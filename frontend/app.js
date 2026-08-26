// ============================================================
// Balance Wheel — Telegram Mini App (Supabase direct, no backend)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = 'https://ljcczzlbjzoouwcxxary.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqY2N6emxianpvb3V3Y3h4YXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTUzOTMsImV4cCI6MjEwMzMzMTM5M30.y23JF2uevZvk4WlOhAqwCQnt_zgUdd_zIyW3d_jmvQ4';

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#B19CD9', '#87CEEB', '#DDA0DD', '#90EE90',
  '#F7DC6F', '#FF8C42', '#5D8AA8', '#E6B0F7',
];

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// State
// ============================================================
let state = {
  user: null,
  spheres: [],
  todayValues: {},
  history: {},
  currentTab: 'today',
  isOnboarded: false,
  userId: null,
};

// ============================================================
// Telegram WebApp
// ============================================================
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// Parse user from Telegram initData
function getTelegramUser() {
  if (!tg || !tg.initData) return null;
  try {
    const params = new URLSearchParams(tg.initData);
    const userJson = params.get('user');
    if (userJson) return JSON.parse(userJson);
  } catch (e) {}
  return null;
}

// ============================================================
// Init
// ============================================================
async function init() {
  const tgUser = getTelegramUser();

  if (!tgUser) {
    // Dev mode — no Telegram context
    state.userId = 'dev-' + Math.random().toString(36).slice(2, 8);
    state.isOnboarded = false;
    renderOnboarding();
    return;
  }

  state.userId = tgUser.id;
  state.user = tgUser;

  try {
    // Upsert user
    await supabase.from('users').upsert({
      id: tgUser.id,
      username: tgUser.username || null,
      first_name: tgUser.first_name || null,
    });

    // Load spheres
    const { data: spheres, error: spheresErr } = await supabase
      .from('spheres')
      .select('*')
      .eq('user_id', tgUser.id)
      .order('display_order', { ascending: true });

    if (spheresErr) throw spheresErr;
    state.spheres = spheres || [];

    if (state.spheres.length === 0) {
      renderOnboarding();
    } else {
      state.isOnboarded = true;
      await loadTodayEntries();
      await loadHistory();
      renderMain();
    }
  } catch (e) {
    showToast('Ошибка: ' + e.message);
    document.getElementById('app').innerHTML = `
      <div class="empty-state">
        <p>⚠️ ${e.message}</p>
      </div>`;
  }
}

// ============================================================
// Onboarding
// ============================================================
function renderOnboarding() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="header">
      <h1>Колесо Баланса</h1>
    </div>
    <div class="onboarding">
      <h2>Добро пожаловать!</h2>
      <p>
        Назови сферы своей жизни, которые хочешь отслеживать.
        Каждый день ты будешь оценивать их от 0 до 10,
        и видеть как меняется твой баланс.
      </p>
      <div id="sphere-inputs"></div>
      <button class="add-sphere-btn" id="add-sphere">+ Добавить сферу</button>
      <button class="save-btn" id="save-spheres">Готово 🎯</button>
    </div>
  `;

  const inputsContainer = document.getElementById('sphere-inputs');
  const defaults = ['Здоровье', 'Финансы', 'Карьера', 'Отношения'];

  function renderRow(value = '', index = 0) {
    const row = document.createElement('div');
    row.className = 'sphere-input-row';
    row.style.animationDelay = `${index * 0.1}s`;
    row.innerHTML = `
      <input type="text" placeholder="Название сферы" value="${value}" maxlength="30" />
      <button class="remove-btn">×</button>
    `;
    row.querySelector('.remove-btn').addEventListener('click', () => row.remove());
    inputsContainer.appendChild(row);
  }

  defaults.forEach((d, i) => renderRow(d, i));

  document.getElementById('add-sphere').addEventListener('click', () => {
    renderRow('', inputsContainer.children.length);
  });

  document.getElementById('save-spheres').addEventListener('click', async () => {
    const rows = inputsContainer.querySelectorAll('.sphere-input-row');
    const spheres = [];
    rows.forEach((row, i) => {
      const name = row.querySelector('input').value.trim();
      if (name) spheres.push({ name, color: COLORS[i % COLORS.length] });
    });

    if (spheres.length < 2) {
      showToast('Добавь хотя бы 2 сферы');
      return;
    }

    if (!state.userId || state.userId.startsWith('dev-')) {
      // Dev mode — store locally
      state.spheres = spheres.map((s, i) => ({
        ...s,
        id: 'local-' + i,
        user_id: state.userId,
        display_order: i,
      }));
      state.isOnboarded = true;
      renderMain();
      return;
    }

    try {
      const inserts = spheres.map((s, i) => ({
        user_id: state.userId,
        name: s.name,
        color: s.color,
        display_order: i,
      }));

      const { data, error } = await supabase
        .from('spheres')
        .insert(inserts)
        .select();

      if (error) throw error;
      state.spheres = data;
      state.isOnboarded = true;

      // Mark onboarded
      await supabase.from('users').update({ onboarded: true }).eq('id', state.userId);

      await loadTodayEntries();
      renderMain();
    } catch (e) {
      showToast('Ошибка: ' + e.message);
    }
  });
}

// ============================================================
// Load entries
// ============================================================
async function loadTodayEntries() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', state.userId)
    .eq('entry_date', today);

  if (error) throw error;

  state.todayValues = {};
  state.spheres.forEach(s => {
    const entry = (data || []).find(e => e.sphere_id === s.id);
    state.todayValues[s.id] = entry ? entry.value : 5;
  });
}

async function loadHistory() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data, error } = await supabase
    .from('entries')
    .select('entry_date, value, note, sphere_id')
    .eq('user_id', state.userId)
    .gte('entry_date', since.toISOString().split('T')[0])
    .order('entry_date', { ascending: true });

  if (error) throw error;

  // Group by date
  state.history = {};
  (data || []).forEach(entry => {
    if (!state.history[entry.entry_date]) state.history[entry.entry_date] = [];
    state.history[entry.entry_date].push(entry);
  });
}

// ============================================================
// Render main
// ============================================================
function renderMain() {
  const app = document.getElementById('app');
  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  app.innerHTML = `
    <div class="header">
      <h1>Колесо Баланса</h1>
      <div class="date">${today}</div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="today">Сегодня</button>
      <button class="tab" data-tab="history">История</button>
      <button class="tab" data-tab="settings">Сферы</button>
    </div>
    <div id="tab-content"></div>
  `;

  document.querySelectorAll('.tab').forEach(t => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t2 => t2.classList.remove('active'));
      t.classList.add('active');
      state.currentTab = t.dataset.tab;
      renderTabContent();
    });
  });

  renderTabContent();
}

function renderTabContent() {
  const container = document.getElementById('tab-content');
  if (state.currentTab === 'today') renderToday(container);
  else if (state.currentTab === 'history') renderHistory(container);
  else if (state.currentTab === 'settings') renderSettings(container);
}

// ============================================================
// Today tab
// ============================================================
function renderToday(container) {
  container.innerHTML = `
    <div class="chart-container">
      <canvas id="wheel-chart"></canvas>
    </div>
    <div class="sliders-section">
      <div class="sliders-title">Оцени свой день (0–10)</div>
      <div id="sliders"></div>
      <button class="save-btn" id="save-entries">Сохранить</button>
    </div>
  `;

  const slidersEl = document.getElementById('sliders');

  state.spheres.forEach((sphere, i) => {
    const color = sphere.color || COLORS[i % COLORS.length];
    const value = state.todayValues[sphere.id] ?? 5;

    const item = document.createElement('div');
    item.className = 'slider-item';
    item.style.animationDelay = `${i * 0.08}s`;
    item.innerHTML = `
      <div class="slider-header">
        <div class="slider-name">
          <div class="slider-dot" style="background: ${color}"></div>
          <span>${sphere.name}</span>
        </div>
        <div class="slider-value" id="val-${sphere.id}">${value}</div>
      </div>
      <input type="range" min="0" max="10" value="${value}"
        data-sphere-id="${sphere.id}" data-color="${color}"
        style="background: linear-gradient(to right, ${color} 0%, ${color} ${value * 10}%, var(--tg-bg) ${value * 10}%)" />
    `;
    slidersEl.appendChild(item);
  });

  slidersEl.querySelectorAll('input[type="range"]').forEach(input => {
    input.addEventListener('input', (e) => {
      const id = e.target.dataset.sphereId;
      const val = parseInt(e.target.value);
      const color = e.target.dataset.color;

      state.todayValues[id] = val;

      const valEl = document.getElementById(`val-${id}`);
      valEl.textContent = val;
      valEl.classList.add('changing');
      setTimeout(() => valEl.classList.remove('changing'), 300);

      e.target.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${val * 10}%, var(--tg-bg) ${val * 10}%)`;
      updateChart();
    });
  });

  document.getElementById('save-entries').addEventListener('click', async () => {
    if (state.userId?.startsWith('dev-')) {
      showToast('Dev режим — данные не сохраняются');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const upserts = state.spheres.map(s => ({
      user_id: state.userId,
      entry_date: today,
      sphere_id: s.id,
      value: Math.max(0, Math.min(10, state.todayValues[s.id] ?? 5)),
    }));

    try {
      const { error } = await supabase
        .from('entries')
        .upsert(upserts, { onConflict: 'user_id,entry_date,sphere_id' });

      if (error) throw error;

      const btn = document.getElementById('save-entries');
      btn.classList.add('success');
      btn.textContent = 'Сохранено! ✅';
      setTimeout(() => {
        btn.classList.remove('success');
        btn.textContent = 'Сохранить';
      }, 2000);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      await loadHistory();
    } catch (e) {
      showToast('Ошибка: ' + e.message);
    }
  });

  renderChart();
}

// ============================================================
// Radar chart
// ============================================================
let chartInstance = null;

function renderChart() {
  const canvas = document.getElementById('wheel-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const labels = state.spheres.map(s => s.name);
  const values = state.spheres.map((s, i) => state.todayValues[s.id] ?? 5);
  const colors = state.spheres.map((s, i) => s.color || COLORS[i % COLORS.length]);

  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(108, 140, 255, 0.4)');
  gradient.addColorStop(1, 'rgba(78, 205, 196, 0.2)');

  if (chartInstance) chartInstance.destroy();

  Chart.register(ChartDataLabels);

  chartInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: gradient,
        borderColor: 'rgba(108, 140, 255, 0.8)',
        borderWidth: 2,
        pointBackgroundColor: colors,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 9,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: (ctx) => colors[ctx.dataIndex] || '#fff',
          font: { size: 11, weight: '600', family: 'Inter' },
          formatter: (v) => v,
          align: 'end',
          anchor: 'end',
          offset: 4,
        },
      },
      scales: {
        r: {
          min: 0, max: 10,
          ticks: {
            stepSize: 2,
            color: 'rgba(255,255,255,0.3)',
            backdropColor: 'transparent',
            font: { size: 9 },
          },
          grid: { color: 'rgba(255,255,255,0.1)' },
          angleLines: { color: 'rgba(255,255,255,0.12)' },
          pointLabels: {
            color: 'rgba(255,255,255,0.85)',
            font: { size: 12, family: 'Inter', weight: '500' },
          },
        },
      },
    },
  });
}

function updateChart() {
  if (!chartInstance) return;
  chartInstance.data.datasets[0].data = state.spheres.map(s => state.todayValues[s.id] ?? 5);
  chartInstance.update('active');
}

// ============================================================
// History tab
// ============================================================
function renderHistory(container) {
  const dates = Object.keys(state.history).sort().reverse();

  if (dates.length === 0) {
    container.innerHTML = `
      <div class="history-section">
        <div class="empty-state">
          <p>📊</p>
          <p>Пока нет истории.<br>Начни заполнять колесо каждый день!</p>
        </div>
      </div>`;
    return;
  }

  let html = '<div class="history-section"><div class="history-title">История за 30 дней</div>';

  dates.slice(0, 30).forEach(date => {
    const entries = state.history[date];
    const avg = entries.reduce((s, e) => s + e.value, 0) / entries.length;
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'short', weekday: 'short',
    });

    html += `
      <div class="history-day">
        <div class="history-date">${dateStr} — средний баланс: <b>${avg.toFixed(1)}</b></div>
        <div class="history-spheres">
          ${entries.map(e => {
            const sphere = state.spheres.find(s => s.id === e.sphere_id);
            const color = sphere?.color || '#666';
            const name = sphere?.name || '?';
            return `<span class="history-pill" style="border-left: 3px solid ${color}">${name}: ${e.value}</span>`;
          }).join('')}
        </div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

// ============================================================
// Settings tab
// ============================================================
function renderSettings(container) {
  container.innerHTML = `
    <div class="sliders-section">
      <div class="sliders-title">Мои сферы</div>
      <div id="spheres-list"></div>
      <button class="add-sphere-btn" id="add-sphere-settings">+ Добавить сферу</button>
    </div>
  `;

  const list = document.getElementById('spheres-list');

  function renderSphereRow(sphere, i) {
    const color = sphere.color || COLORS[i % COLORS.length];
    const row = document.createElement('div');
    row.className = 'sphere-input-row';
    row.innerHTML = `
      <input type="text" value="${sphere.name}" maxlength="30" />
      <button class="remove-btn" data-id="${sphere.id}">×</button>
    `;
    row.querySelector('input').addEventListener('blur', async (e) => {
      const name = e.target.value.trim();
      if (name && !state.userId?.startsWith('dev-')) {
        try {
          const { error } = await supabase
            .from('spheres')
            .update({ name })
            .eq('id', sphere.id)
            .eq('user_id', state.userId);
          if (error) throw error;
        } catch (err) {
          showToast('Ошибка: ' + err.message);
        }
      }
    });
    row.querySelector('.remove-btn').addEventListener('click', async () => {
      if (state.userId?.startsWith('dev-')) {
        state.spheres = state.spheres.filter(s => s.id !== sphere.id);
        row.remove();
        return;
      }
      try {
        const { error } = await supabase
          .from('spheres')
          .delete()
          .eq('id', sphere.id)
          .eq('user_id', state.userId);
        if (error) throw error;
        state.spheres = state.spheres.filter(s => s.id !== sphere.id);
        row.style.transition = 'all 0.3s';
        row.style.opacity = '0';
        row.style.transform = 'translateX(-30px)';
        setTimeout(() => row.remove(), 300);
        showToast('Сфера удалена');
      } catch (err) {
        showToast('Ошибка: ' + err.message);
      }
    });
    list.appendChild(row);
  }

  state.spheres.forEach((s, i) => renderSphereRow(s, i));

  document.getElementById('add-sphere-settings').addEventListener('click', async () => {
    const name = prompt('Название новой сферы:');
    if (!name) return;

    if (state.userId?.startsWith('dev-')) {
      const newSphere = {
        id: 'local-' + Date.now(),
        user_id: state.userId,
        name: name.trim(),
        color: COLORS[state.spheres.length % COLORS.length],
        display_order: state.spheres.length,
      };
      state.spheres.push(newSphere);
      renderSphereRow(newSphere, state.spheres.length - 1);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('spheres')
        .insert({
          user_id: state.userId,
          name: name.trim(),
          color: COLORS[state.spheres.length % COLORS.length],
          display_order: state.spheres.length,
        })
        .select()
        .single();

      if (error) throw error;
      state.spheres.push(data);
      renderSphereRow(data, state.spheres.length - 1);
      await loadTodayEntries();
      if (state.currentTab === 'today') renderTabContent();
    } catch (err) {
      showToast('Ошибка: ' + err.message);
    }
  });
}

// ============================================================
// Toast
// ============================================================
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ============================================================
// Start
// ============================================================
init();
