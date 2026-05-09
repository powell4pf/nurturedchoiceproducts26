// ============================================================
// NURTUREDCHOICE — AUTH & SESSION MANAGER
// ============================================================

const Auth = {
  // Session stored in sessionStorage (clears on browser close)
  _key: 'nc_session',

  token() {
    const s = this.session();
    return s ? s.access_token : null;
  },

  session() {
    try { return JSON.parse(sessionStorage.getItem(this._key)); } catch { return null; }
  },

  user() {
    const s = this.session();
    return s ? s.user : null;
  },

  role() {
    const u = this.user();
    return u ? (u.user_metadata?.role || 'sales') : null;
  },

  fullName() {
    const u = this.user();
    return u ? (u.user_metadata?.full_name || u.email) : 'Unknown';
  },

  isLoggedIn() {
    const s = this.session();
    if (!s) return false;
    // Check expiry
    const exp = s.expires_at ? s.expires_at * 1000 : 0;
    return exp === 0 || Date.now() < exp;
  },

  saveSession(data) {
    sessionStorage.setItem(this._key, JSON.stringify(data));
  },

  clearSession() {
    sessionStorage.removeItem(this._key);
  },

  // Role-based permission check
  can(action) {
    const role = this.role();
    const perms = {
      admin:   ['view','create','edit','delete','payments','reports','stock','users'],
      sales:   ['view','create','edit','payments','reports'],
      cashier: ['view','payments'],
    };
    return (perms[role] || []).includes(action);
  },

  async logout() {
    try { await SB.signOut(); } catch(e) {}
    this.clearSession();
    window.location.href = 'login.html';
  }
};
