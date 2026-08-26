const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { supabase, supabaseAdmin } = require('./supabase');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ============================================================
// Auth middleware — validate Telegram initData
// ============================================================
function telegramAuth(req, res, next) {
  const initData = req.headers['x-telegram-init-data'];
  if (!initData) {
    return res.status(401).json({ error: 'Missing Telegram init data' });
  }

  // Parse user from initData (URLSearchParams format)
  try {
    const params = new URLSearchParams(initData);
    const userJson = params.get('user');
    if (!userJson) return res.status(401).json({ error: 'No user in init data' });
    const user = JSON.parse(userJson);
    req.userId = user.id;
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid init data' });
  }
}

// ============================================================
// Routes
// ============================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get or create user
app.post('/api/auth/login', telegramAuth, async (req, res) => {
  const { id, username, first_name } = req.user;

  const { data, error } = await supabaseAdmin
    .from('users')
    .upsert({
      id: id,
      username: username || null,
      first_name: first_name || null,
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ user: data });
});

// Get user's spheres
app.get('/api/spheres', telegramAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('spheres')
    .select('*')
    .eq('user_id', req.userId)
    .order('display_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ spheres: data || [] });
});

// Create a sphere
app.post('/api/spheres', telegramAuth, async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Sphere name required' });

  // Get max display_order
  const { data: existing } = await supabaseAdmin
    .from('spheres')
    .select('display_order')
    .eq('user_id', req.userId)
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing && existing.length > 0) ? existing[0].display_order + 1 : 0;

  const { data, error } = await supabaseAdmin
    .from('spheres')
    .insert({
      user_id: req.userId,
      name: name.trim(),
      color: color || null,
      display_order: nextOrder,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ sphere: data });
});

// Update a sphere
app.patch('/api/spheres/:id', telegramAuth, async (req, res) => {
  const { name, color, display_order } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (color !== undefined) updates.color = color;
  if (display_order !== undefined) updates.display_order = display_order;

  const { data, error } = await supabaseAdmin
    .from('spheres')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ sphere: data });
});

// Delete a sphere
app.delete('/api/spheres/:id', telegramAuth, async (req, res) => {
  const { error } = await supabaseAdmin
    .from('spheres')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Batch create spheres (for onboarding)
app.post('/api/spheres/batch', telegramAuth, async (req, res) => {
  const { spheres } = req.body;
  if (!Array.isArray(spheres)) return res.status(400).json({ error: 'spheres array required' });

  const inserts = spheres.map((s, i) => ({
    user_id: req.userId,
    name: s.name.trim(),
    color: s.color || null,
    display_order: i,
  }));

  const { data, error } = await supabaseAdmin
    .from('spheres')
    .insert(inserts)
    .select();

  if (error) return res.status(500).json({ error: error.message });

  // Mark user as onboarded
  await supabaseAdmin
    .from('users')
    .update({ onboarded: true })
    .eq('id', req.userId);

  res.json({ spheres: data });
});

// ============================================================
// Entries (daily check-ins)
// ============================================================

// Get entries for a date range
app.get('/api/entries', telegramAuth, async (req, res) => {
  const { date, from, to } = req.query;
  let query = supabaseAdmin
    .from('entries')
    .select('*, spheres(*)')
    .eq('user_id', req.userId);

  if (date) {
    query = query.eq('entry_date', date);
  } else if (from && to) {
    query = query.gte('entry_date', from).lte('entry_date', to);
  } else {
    // Default: today
    const today = new Date().toISOString().split('T')[0];
    query = query.eq('entry_date', today);
  }

  const { data, error } = await query.order('entry_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ entries: data || [] });
});

// Upsert entry (create or update for today)
app.post('/api/entries', telegramAuth, async (req, res) => {
  const { sphere_id, value, note, entry_date } = req.body;
  if (!sphere_id || value === undefined) {
    return res.status(400).json({ error: 'sphere_id and value required' });
  }

  const date = entry_date || new Date().toISOString().split('T')[0];

  const { data, error } = await supabaseAdmin
    .from('entries')
    .upsert({
      user_id: req.userId,
      entry_date: date,
      sphere_id: sphere_id,
      value: Math.max(0, Math.min(10, parseInt(value))),
      note: note || null,
    }, { onConflict: 'user_id,entry_date,sphere_id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ entry: data });
});

// Batch upsert entries (save all at once)
app.post('/api/entries/batch', telegramAuth, async (req, res) => {
  const { entries, entry_date } = req.body;
  if (!Array.isArray(entries)) return res.status(400).json({ error: 'entries array required' });

  const date = entry_date || new Date().toISOString().split('T')[0];

  const upserts = entries.map(e => ({
    user_id: req.userId,
    entry_date: date,
    sphere_id: e.sphere_id,
    value: Math.max(0, Math.min(10, parseInt(e.value))),
    note: e.note || null,
  }));

  const { data, error } = await supabaseAdmin
    .from('entries')
    .upsert(upserts, { onConflict: 'user_id,entry_date,sphere_id' })
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ entries: data });
});

// Get history (last N days)
app.get('/api/history', telegramAuth, async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from('entries')
    .select('entry_date, value, note, spheres(name, color)')
    .eq('user_id', req.userId)
    .gte('entry_date', since.toISOString().split('T')[0])
    .order('entry_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Group by date
  const byDate = {};
  (data || []).forEach(entry => {
    if (!byDate[entry.entry_date]) byDate[entry.entry_date] = [];
    byDate[entry.entry_date].push(entry);
  });

  res.json({ history: byDate });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Balance Wheel API running on http://localhost:${PORT}`);
});
