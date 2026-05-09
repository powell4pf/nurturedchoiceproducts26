// ============================================================
// NURTUREDCHOICE — CLOUD DATA LAYER (Supabase)
// ============================================================

const DB = {

  // ---- Products Catalog (static) ----
  PRODUCTS: [
    { id: 'H100',   category: 'honey',         name: 'Pure Honey 100g',            icon: '🍯', price: 180,  size: '100g',  variety: null },
    { id: 'H200',   category: 'honey',         name: 'Pure Honey 200g',            icon: '🍯', price: 320,  size: '200g',  variety: null },
    { id: 'H300',   category: 'honey',         name: 'Pure Honey 300g',            icon: '🍯', price: 450,  size: '300g',  variety: null },
    { id: 'H500',   category: 'honey',         name: 'Pure Honey 500g',            icon: '🍯', price: 700,  size: '500g',  variety: null },
    { id: 'H1KG',   category: 'honey',         name: 'Pure Honey 1kg',             icon: '🍯', price: 1300, size: '1kg',   variety: null },
    { id: 'PBS150', category: 'peanut_butter', name: 'Peanut Butter Smooth 150g',  icon: '🥜', price: 150,  size: '150g',  variety: 'smooth' },
    { id: 'PBS250', category: 'peanut_butter', name: 'Peanut Butter Smooth 250g',  icon: '🥜', price: 230,  size: '250g',  variety: 'smooth' },
    { id: 'PBS400', category: 'peanut_butter', name: 'Peanut Butter Smooth 400g',  icon: '🥜', price: 360,  size: '400g',  variety: 'smooth' },
    { id: 'PBS800', category: 'peanut_butter', name: 'Peanut Butter Smooth 800g',  icon: '🥜', price: 680,  size: '800g',  variety: 'smooth' },
    { id: 'PBC150', category: 'peanut_butter', name: 'Peanut Butter Crunchy 150g', icon: '🥜', price: 150,  size: '150g',  variety: 'crunchy' },
    { id: 'PBC250', category: 'peanut_butter', name: 'Peanut Butter Crunchy 250g', icon: '🥜', price: 230,  size: '250g',  variety: 'crunchy' },
    { id: 'PBC400', category: 'peanut_butter', name: 'Peanut Butter Crunchy 400g', icon: '🥜', price: 360,  size: '400g',  variety: 'crunchy' },
    { id: 'PBC800', category: 'peanut_butter', name: 'Peanut Butter Crunchy 800g', icon: '🥜', price: 680,  size: '800g',  variety: 'crunchy' },
    { id: 'PN50',   category: 'peanuts',       name: 'Roasted Peanuts 50g',        icon: '🫘', price: 60,   size: '50g',   variety: null },
    { id: 'PN100',  category: 'peanuts',       name: 'Roasted Peanuts 100g',       icon: '🫘', price: 110,  size: '100g',  variety: null },
    { id: 'PN200',  category: 'peanuts',       name: 'Roasted Peanuts 200g',       icon: '🫘', price: 200,  size: '200g',  variety: null },
  ],

  getProduct(id) { return this.PRODUCTS.find(p => p.id === id); },

  // ---- In-memory cache ----
  _cache: { customers: null, orders: null, payments: null, creditnotes: null, stock: null },
  invalidate(table) { this._cache[table] = null; },
  invalidateAll() { Object.keys(this._cache).forEach(k => this._cache[k] = null); },

  // ---- STOCK ----
  async getStock() {
    if (this._cache.stock) return this._cache.stock;
    try {
      const rows = await SB.select('stock', '?select=product_id,qty');
      const map = {};
      this.PRODUCTS.forEach(p => { map[p.id] = 50; });
      rows.forEach(r => { map[r.product_id] = r.qty; });
      this._cache.stock = map;
      return map;
    } catch(e) {
      const map = {};
      this.PRODUCTS.forEach(p => { map[p.id] = 50; });
      return map;
    }
  },

  async updateStock(productId, delta) {
    try {
      const stock = await this.getStock();
      const newQty = Math.max(0, (stock[productId] || 0) + delta);
      await SB.upsert('stock', { product_id: productId, qty: newQty, updated_at: new Date().toISOString() });
      if (this._cache.stock) this._cache.stock[productId] = newQty;
    } catch(e) { console.error('updateStock:', e); }
  },

  async setStock(productId, qty) {
    try {
      const newQty = Math.max(0, qty);
      await SB.upsert('stock', { product_id: productId, qty: newQty, updated_at: new Date().toISOString() });
      if (this._cache.stock) this._cache.stock[productId] = newQty;
    } catch(e) { console.error('setStock:', e); throw e; }
  },

  // ---- CUSTOMERS ----
  async getCustomers() {
    if (this._cache.customers) return this._cache.customers;
    try {
      const rows = await SB.select('customers', '?select=*&order=name.asc');
      this._cache.customers = rows;
      return rows;
    } catch(e) { console.error('getCustomers:', e); return []; }
  },

  async getCustomer(id) {
    const list = await this.getCustomers();
    return list.find(c => c.id === id) || null;
  },

  async addCustomer(data) {
    try {
      const rows = await SB.insert('customers', {
        ...data, created_by: Auth.user()?.id, created_at: new Date().toISOString()
      });
      this.invalidate('customers');
      return rows[0];
    } catch(e) { console.error('addCustomer:', e); throw e; }
  },

  async updateCustomer(id, data) {
    try {
      await SB.update('customers', { id }, { ...data, updated_at: new Date().toISOString() });
      this.invalidate('customers');
    } catch(e) { console.error('updateCustomer:', e); throw e; }
  },

  // ---- ORDERS ----
  async getOrders() {
    if (this._cache.orders) return this._cache.orders;
    try {
      const rows = await SB.select('orders', '?select=*&order=created_at.desc');
      const parsed = rows.map(o => this._normaliseOrder(o));
      this._cache.orders = parsed;
      return parsed;
    } catch(e) { console.error('getOrders:', e); return []; }
  },

  async getOrder(id) {
    const list = await this.getOrders();
    return list.find(o => o.id === id) || null;
  },

  async addOrder(data) {
    try {
      const orders = await this.getOrders();
      const orderId = 'ORD-' + String(orders.length + 1).padStart(4, '0');
      const row = {
        id: orderId,
        customer_id: data.customerId,
        items: JSON.stringify(data.items),
        subtotal: data.subtotal || data.total,
        vat: data.vat || 0,
        total: data.total,
        notes: data.notes || '',
        status: 'pending',
        payment_status: 'unpaid',
        amount_paid: 0,
        created_by: Auth.user()?.id,
        created_at: new Date().toISOString(),
      };
      const rows = await SB.insert('orders', row);
      for (const item of data.items) {
        await this.updateStock(item.productId, -item.qty);
      }
      this.invalidate('orders');
      return this._normaliseOrder(rows[0]);
    } catch(e) { console.error('addOrder:', e); throw e; }
  },

  async updateOrder(id, data) {
    try {
      const dbData = { updated_at: new Date().toISOString() };
      if (data.amountPaid !== undefined) dbData.amount_paid = data.amountPaid;
      if (data.paymentStatus !== undefined) dbData.payment_status = data.paymentStatus;
      if (data.status !== undefined) dbData.status = data.status;
      if (data.notes !== undefined) dbData.notes = data.notes;
      await SB.update('orders', { id }, dbData);
      this.invalidate('orders');
    } catch(e) { console.error('updateOrder:', e); throw e; }
  },

  _normaliseOrder(row) {
    return {
      ...row,
      customerId: row.customer_id,
      paymentStatus: row.payment_status || 'unpaid',
      amountPaid: row.amount_paid || 0,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
      date: row.created_at,
    };
  },

  // ---- PAYMENTS ----
  async getPayments() {
    if (this._cache.payments) return this._cache.payments;
    try {
      const rows = await SB.select('payments', '?select=*&order=created_at.desc');
      const normalised = rows.map(p => ({ ...p, orderId: p.order_id, date: p.created_at }));
      this._cache.payments = normalised;
      return normalised;
    } catch(e) { console.error('getPayments:', e); return []; }
  },

  async addPayment(data) {
    try {
      const payments = await this.getPayments();
      const payId = 'PAY-' + String(payments.length + 1).padStart(4, '0');
      const row = {
        id: payId,
        order_id: data.orderId,
        amount: data.amount,
        method: data.method,
        reference: data.reference || '',
        notes: data.notes || '',
        created_by: Auth.user()?.id,
        created_at: new Date().toISOString(),
      };
      await SB.insert('payments', row);
      const order = await this.getOrder(data.orderId);
      if (order) {
        const totalPaid = order.amountPaid + data.amount;
        const status = totalPaid >= order.total ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid';
        await this.updateOrder(data.orderId, { amountPaid: totalPaid, paymentStatus: status });
      }
      this.invalidate('payments');
      this.invalidate('orders');
      return { ...row, orderId: row.order_id, date: row.created_at };
    } catch(e) { console.error('addPayment:', e); throw e; }
  },

  async getOrderPayments(orderId) {
    const list = await this.getPayments();
    return list.filter(p => p.order_id === orderId || p.orderId === orderId);
  },

  // ---- CREDIT NOTES ----
  async getCreditNotes() {
    if (this._cache.creditnotes) return this._cache.creditnotes;
    try {
      const rows = await SB.select('credit_notes', '?select=*&order=created_at.desc');
      const normalised = rows.map(cn => ({ ...cn, orderId: cn.order_id, date: cn.created_at }));
      this._cache.creditnotes = normalised;
      return normalised;
    } catch(e) { console.error('getCreditNotes:', e); return []; }
  },

  async addCreditNote(data) {
    try {
      const list = await this.getCreditNotes();
      const cnId = 'CN-' + String(list.length + 1).padStart(4, '0');
      const row = {
        id: cnId,
        order_id: data.orderId,
        amount: data.amount,
        reason: data.reason,
        notes: data.notes || '',
        created_by: Auth.user()?.id,
        created_at: new Date().toISOString(),
      };
      await SB.insert('credit_notes', row);
      this.invalidate('creditnotes');
      return { ...row, orderId: row.order_id, date: row.created_at };
    } catch(e) { console.error('addCreditNote:', e); throw e; }
  },

  // ---- HELPERS ----
  fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' });
  },
  fmtMoney(n) {
    return 'KES ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  calcOrderTotal(items) {
    return items.reduce((s, i) => s + (i.qty * i.unitPrice), 0);
  },

  // ---- ANALYTICS ----
  async getSalesByMonth() {
    const orders = await this.getOrders();
    const months = {};
    orders.forEach(o => {
      const m = new Date(o.date).toLocaleString('en', { month: 'short', year: '2-digit' });
      months[m] = (months[m] || 0) + o.total;
    });
    return months;
  },

  async getSalesByProduct() {
    const orders = await this.getOrders();
    const byProd = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        byProd[item.productId] = (byProd[item.productId] || 0) + item.qty * item.unitPrice;
      });
    });
    return byProd;
  },

  async getOutstandingCustomers() {
    const orders = await this.getOrders();
    const map = {};
    orders.forEach(o => {
      if (o.paymentStatus !== 'paid') {
        const bal = o.total - o.amountPaid;
        const cid = o.customerId;
        if (!map[cid]) map[cid] = { customerId: cid, balance: 0, orders: [] };
        map[cid].balance += bal;
        map[cid].orders.push(o.id);
      }
    });
    return Object.values(map);
  },
};
