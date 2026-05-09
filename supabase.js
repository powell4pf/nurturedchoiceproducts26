// ============================================================
// NURTUREDCHOICE — SUPABASE CLOUD DATABASE CONFIG
// ============================================================
// STEP: Paste your Supabase Project URL and Anon Key below.
// You get these from: https://supabase.com → Your Project → Settings → API
// ============================================================

const SUPABASE_URL  = 'https://cnhuvrgvtfbxntmbrmew.supabase.co/rest/v1/';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuaHV2cmd2dGZieG50bWJybWV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNDk0MjEsImV4cCI6MjA5MzkyNTQyMX0.xwpjpDyHcGFYKw2SHO9AhHZ_Lmi8p3izvj8YMMhnl6k';

// ---- Supabase REST helper ----
const SB = {
  headers() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON,
      'Authorization': 'Bearer ' + (Auth.token() || SUPABASE_ANON),
      'Prefer': 'return=representation',
    };
  },

  async select(table, query = '') {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      headers: this.headers()
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.message || r.statusText); }
    return r.json();
  },

  async insert(table, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(data)
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.message || r.statusText); }
    return r.json();
  },

  async update(table, match, data) {
    const query = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join('&');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(data)
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.message || r.statusText); }
    return r.json();
  },

  async upsert(table, data) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...this.headers(), 'Prefer': 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(data)
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.message || r.statusText); }
    return r.json();
  },

  async delete(table, match) {
    const query = Object.entries(match).map(([k,v]) => `${k}=eq.${v}`).join('&');
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'DELETE',
      headers: this.headers()
    });
    if (!r.ok) { const e = await r.json(); throw new Error(e.message || r.statusText); }
    return true;
  },

  // ---- Auth ----
  async signIn(email, password) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || data.msg || 'Login failed');
    return data;
  },

  async signOut() {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + Auth.token() }
    });
  }
};
