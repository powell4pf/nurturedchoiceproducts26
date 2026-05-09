// ============================================================
// NURTUREDCHOICE PRODUCTS — APP ENGINE
// ============================================================

const App = {
  currentPage: 'dashboard',

  async init() {
    // Auth guard — redirect to login if not signed in
    if (!Auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }

    // Show user info in sidebar
    const name = Auth.fullName();
    const role = Auth.role();
    document.getElementById('userName').textContent = name;
    document.getElementById('userRole').textContent = role.charAt(0).toUpperCase() + role.slice(1);
    document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();

    // Logout button
    document.getElementById('logoutBtn').onclick = () => Auth.logout();

    this.bindNav();
    this.bindModal();
    this.updateSidebarDate();

    document.getElementById('quickSaleBtn').onclick = () => Pages.newOrderModal();
    document.getElementById('menuToggle').onclick = () => {
      document.getElementById('sidebar').classList.toggle('open');
    };

    // Role-based nav visibility
    if (role === 'cashier') {
      document.querySelectorAll('.nav-item').forEach(el => {
        const restricted = ['products','customers','orders','invoices','credit-notes','reports'];
        if (restricted.includes(el.dataset.page)) el.style.display = 'none';
      });
    }

    await this.render('dashboard');
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.onclick = () => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        el.classList.add('active');
        const page = el.dataset.page;
        this.currentPage = page;
        document.getElementById('pageTitle').textContent = el.textContent.trim();
        this.render(page);
        document.getElementById('sidebar').classList.remove('open');
      };
    });
  },

  bindModal() {
    document.getElementById('modalClose').onclick = () => this.closeModal();
    document.getElementById('modalOverlay').onclick = () => this.closeModal();
  },

  openModal(title, bodyHTML, wide = false) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modal').classList.add('open');
    document.getElementById('modalOverlay').classList.add('open');
    if (wide) document.getElementById('modal').style.maxWidth = '860px';
    else document.getElementById('modal').style.maxWidth = '680px';
  },

  closeModal() {
    document.getElementById('modal').classList.remove('open');
    document.getElementById('modalOverlay').classList.remove('open');
    document.getElementById('modalBody').innerHTML = '';
  },

  showLoading() {
    document.getElementById('pageLoading').style.display = 'flex';
    document.getElementById('pageContent').style.display = 'none';
    document.getElementById('syncIndicator').className = 'sync-indicator syncing';
    document.getElementById('syncIndicator').title = 'Loading from cloud...';
  },

  hideLoading() {
    document.getElementById('pageLoading').style.display = 'none';
    document.getElementById('pageContent').style.display = 'block';
    document.getElementById('syncIndicator').className = 'sync-indicator';
    document.getElementById('syncIndicator').title = 'Cloud sync active';
  },

  async render(page) {
    this.showLoading();
    const pages = {
      'dashboard':    Pages.dashboard,
      'products':     Pages.products,
      'customers':    Pages.customers,
      'orders':       Pages.orders,
      'payments':     Pages.payments,
      'invoices':     Pages.invoices,
      'credit-notes': Pages.creditNotes,
      'reports':      Pages.reports,
    };
    try {
      if (pages[page]) await pages[page]();
    } catch(e) {
      document.getElementById('pageContent').innerHTML = `
        <div class="card" style="text-align:center;padding:48px">
          <div style="font-size:2.5rem;margin-bottom:12px">⚠️</div>
          <div style="font-weight:700;color:#C0392B;margin-bottom:6px">Cloud connection error</div>
          <div class="text-muted">${e.message}</div>
          <button class="btn-primary mt-2" onclick="App.render('${page}')">Retry</button>
        </div>`;
      document.getElementById('syncIndicator').className = 'sync-indicator error';
      document.getElementById('syncIndicator').title = 'Connection error';
    }
    this.hideLoading();
  },

  updateSidebarDate() {
    const d = new Date();
    document.getElementById('sidebarDate').textContent =
      d.toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  },

  toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:28px;right:28px;z-index:9999;padding:12px 20px;border-radius:10px;
      font-size:.88rem;font-weight:600;color:#fff;box-shadow:0 4px 24px rgba(0,0,0,.2);
      background:${type === 'success' ? '#2E7D53' : type === 'error' ? '#C0392B' : '#C8820A'};
      animation:fadeIn .2s;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
};

// ============================================================
// PAGES
// ============================================================

const Pages = {

  // ---- DASHBOARD ----
  dashboard() {
    const orders = DB.getOrders();
    const payments = DB.getPayments();
    const customers = DB.getCustomers();
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
    const outstanding = orders.filter(o => o.paymentStatus !== 'paid').length;
    const stock = DB.getStock();
    const lowStock = DB.PRODUCTS.filter(p => (stock[p.id] || 0) < 20);

    const salesByMonth = DB.getSalesByMonth();
    const months = Object.keys(salesByMonth).slice(-6);
    const monthValues = months.map(m => salesByMonth[m]);
    const maxVal = Math.max(...monthValues, 1);

    const salesByProd = DB.getSalesByProduct();
    const topProds = Object.entries(salesByProd)
      .sort((a,b) => b[1] - a[1]).slice(0,5);

    const recentOrders = [...orders].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5);

    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card honey">
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value">${DB.fmtMoney(totalRevenue).replace('KES ','')}</div>
          <div class="stat-sub">KES — all orders</div>
        </div>
        <div class="stat-card green">
          <div class="stat-label">Collected</div>
          <div class="stat-value">${DB.fmtMoney(totalCollected).replace('KES ','')}</div>
          <div class="stat-sub">Cash in hand</div>
        </div>
        <div class="stat-card red">
          <div class="stat-label">Unpaid Orders</div>
          <div class="stat-value">${outstanding}</div>
          <div class="stat-sub">Need follow-up</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-label">Customers</div>
          <div class="stat-value">${customers.length}</div>
          <div class="stat-sub">Total accounts</div>
        </div>
      </div>

      ${lowStock.length ? `<div class="alert alert-warning">⚠️ <strong>${lowStock.length} products</strong> are running low on stock: ${lowStock.map(p=>p.name).join(', ')}</div>` : ''}

      <div class="grid-2" style="margin-bottom:20px">
        <div class="card">
          <div class="card-title">Sales Trend
            <span class="text-muted" style="font-size:.78rem;font-family:DM Mono,monospace">Last 6 months</span>
          </div>
          <canvas id="salesChart" height="200"></canvas>
        </div>
        <div class="card">
          <div class="card-title">Top Products by Revenue</div>
          <canvas id="prodChart" height="200"></canvas>
        </div>
      </div>

      <div class="grid-21">
        <div class="card">
          <div class="card-title">Recent Orders
            <button class="btn-ghost btn-sm" onclick="Pages.orders()">View All</button>
          </div>
          <div class="table-wrapper">
            <table>
              <thead><tr>
                <th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th>
              </tr></thead>
              <tbody>
                ${recentOrders.map(o => {
                  const c = DB.getCustomer(o.customerId);
                  return `<tr>
                    <td class="text-mono">${o.id}</td>
                    <td>${c ? c.name : '—'}</td>
                    <td>${DB.fmtMoney(o.total)}</td>
                    <td>${Pages.payBadge(o.paymentStatus)}</td>
                    <td>${DB.fmtDate(o.date)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Stock Alert</div>
          ${DB.PRODUCTS.slice(0,8).map(p => {
            const qty = stock[p.id] || 0;
            const level = qty > 40 ? 'high' : qty > 20 ? 'medium' : 'low';
            const pct = Math.min(100, (qty / 100) * 100);
            return `<div style="margin-bottom:14px">
              <div class="flex-between mb-1">
                <span style="font-size:.82rem;font-weight:600">${p.name}</span>
                <span class="text-mono" style="font-size:.78rem">${qty} units</span>
              </div>
              <div class="stock-bar"><div class="stock-bar-fill ${level}" style="width:${pct}%"></div></div>
            </div>`;
          }).join('')}
          <button class="btn-secondary btn-sm mt-2" onclick="App.render('products')">Manage Stock →</button>
        </div>
      </div>
    `;

    // Charts
    setTimeout(() => {
      Pages.drawSalesChart(months, monthValues);
      Pages.drawProdChart(topProds);
    }, 50);
  },

  drawSalesChart(labels, data) {
    const canvas = document.getElementById('salesChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.offsetWidth || 400;
    const h = canvas.offsetHeight || 200;
    canvas.width = w; canvas.height = h;
    const pad = { top:20, right:16, bottom:36, left:60 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const max = Math.max(...data, 1);
    const barW = chartW / data.length * 0.55;
    const gap = chartW / data.length;

    ctx.clearRect(0,0,w,h);

    // Grid lines
    ctx.strokeStyle = '#E8DCC8'; ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach(f => {
      const y = pad.top + chartH * (1 - f);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
      ctx.fillStyle = '#7A6654'; ctx.font = '10px DM Mono,monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(max * f / 1000) + 'k', pad.left - 6, y + 4);
    });

    // Bars
    data.forEach((val, i) => {
      const x = pad.left + i * gap + (gap - barW) / 2;
      const barH = (val / max) * chartH;
      const y = pad.top + chartH - barH;

      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, '#F5A623'); grad.addColorStop(1, '#C8820A');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Label
      ctx.fillStyle = '#7A6654'; ctx.font = '10px DM Sans,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i] || '', x + barW/2, h - 8);
    });
  },

  drawProdChart(topProds) {
    const canvas = document.getElementById('prodChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.offsetWidth || 400;
    const h = canvas.offsetHeight || 200;
    canvas.width = w; canvas.height = h;

    const colors = ['#C8820A','#F5A623','#2E7D53','#1A6B8A','#6B4226'];
    const total = topProds.reduce((s,[,v]) => s+v, 0) || 1;
    const cx = w/2 - 40, cy = h/2, r = Math.min(cx, cy) - 10;

    let angle = -Math.PI/2;
    topProds.forEach(([id, val], i) => {
      const slice = (val/total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      angle += slice;
    });

    // Center hole
    ctx.beginPath(); ctx.arc(cx, cy, r*0.55, 0, Math.PI*2);
    ctx.fillStyle = '#fff'; ctx.fill();

    // Legend
    const lx = w - 130, ly = 20;
    topProds.forEach(([id, val], i) => {
      const p = DB.getProduct(id);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(lx, ly + i*24, 12, 12);
      ctx.fillStyle = '#3D2B1F'; ctx.font = '11px DM Sans,sans-serif';
      ctx.textAlign = 'left';
      const name = p ? p.name.replace(/\d+g|1kg/i,'').trim().substring(0,14) : id;
      ctx.fillText(name, lx + 16, ly + i*24 + 10);
      ctx.fillStyle = '#7A6654'; ctx.font = '10px DM Mono,monospace';
      ctx.fillText(DB.fmtMoney(val), lx + 16, ly + i*24 + 22);
    });
  },

  payBadge(status) {
    const map = { paid:'badge-success', partial:'badge-warning', unpaid:'badge-danger' };
    return `<span class="badge ${map[status]||'badge-neutral'}">${status||'unpaid'}</span>`;
  },

  orderStatusBadge(status) {
    const map = { completed:'badge-success', pending:'badge-warning', cancelled:'badge-danger' };
    return `<span class="badge ${map[status]||'badge-neutral'}">${status}</span>`;
  },

  // ---- PRODUCTS ----
  products() {
    const stock = DB.getStock();
    const content = document.getElementById('pageContent');

    const cats = [
      { key:'honey', label:'🍯 Honey', color:'#C8820A' },
      { key:'peanut_butter', label:'🥜 Peanut Butter', color:'#6B4226' },
      { key:'peanuts', label:'🫘 Peanuts', color:'#2E7D53' },
    ];

    content.innerHTML = `
      <div class="section-header">
        <div class="section-title">Products & Stock Management</div>
        <div class="flex gap-1">
          <button class="btn-secondary btn-sm" onclick="Pages.stockAdjust()">Adjust Stock</button>
          <button class="btn-primary btn-sm" onclick="Pages.updatePricesModal()">Update Prices</button>
        </div>
      </div>

      ${cats.map(cat => {
        const prods = DB.PRODUCTS.filter(p => p.category === cat.key);
        return `
          <div class="card mb-2" style="margin-bottom:20px">
            <div class="card-title" style="color:${cat.color}">${cat.label}
              <span class="text-muted" style="font-size:.78rem">${prods.length} SKUs</span>
            </div>
            <div class="table-wrapper">
              <table>
                <thead><tr>
                  <th>SKU</th><th>Product</th>${cat.key==='peanut_butter'?'<th>Variety</th>':''}<th>Size</th>
                  <th>Unit Price</th><th>Stock (units)</th><th>Stock Value</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>
                  ${prods.map(p => {
                    const qty = stock[p.id] || 0;
                    const level = qty > 40 ? 'badge-success' : qty > 20 ? 'badge-warning' : 'badge-danger';
                    const label = qty > 40 ? 'Good' : qty > 20 ? 'Low' : 'Critical';
                    const val = qty * p.price;
                    return `<tr>
                      <td class="text-mono">${p.id}</td>
                      <td><strong>${p.name}</strong></td>
                      ${cat.key==='peanut_butter' ? `<td><span class="badge badge-info">${p.variety}</span></td>` : ''}
                      <td>${p.size}</td>
                      <td>${DB.fmtMoney(p.price)}</td>
                      <td>
                        <div class="flex-between">
                          <span style="font-weight:700;font-size:1rem">${qty}</span>
                        </div>
                        <div class="stock-bar" style="margin-top:4px">
                          <div class="stock-bar-fill ${qty>40?'high':qty>20?'medium':'low'}" style="width:${Math.min(100,qty)}%"></div>
                        </div>
                      </td>
                      <td>${DB.fmtMoney(val)}</td>
                      <td><span class="badge ${level}">${label}</span></td>
                      <td>
                        <button class="btn-secondary btn-xs" onclick="Pages.stockEditModal('${p.id}')">Edit Stock</button>
                      </td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
      }).join('')}

      <div class="card">
        <div class="card-title">Stock Overview Chart</div>
        <canvas id="stockChart" height="220"></canvas>
      </div>
    `;

    setTimeout(() => Pages.drawStockChart(stock), 50);
  },

  drawStockChart(stock) {
    const canvas = document.getElementById('stockChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.offsetWidth || 600;
    const h = canvas.offsetHeight || 220;
    canvas.width = w; canvas.height = h;
    const prods = DB.PRODUCTS;
    const pad = { top:20, right:20, bottom:60, left:50 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const max = Math.max(...prods.map(p => stock[p.id]||0), 1);
    const barW = chartW / prods.length * 0.6;
    const gap = chartW / prods.length;

    ctx.clearRect(0,0,w,h);

    // Grid
    [0.25,0.5,0.75,1].forEach(f => {
      const y = pad.top + chartH*(1-f);
      ctx.strokeStyle='#E8DCC8'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+chartW,y); ctx.stroke();
      ctx.fillStyle='#7A6654'; ctx.font='10px DM Mono,monospace'; ctx.textAlign='right';
      ctx.fillText(Math.round(max*f), pad.left-4, y+4);
    });

    const catColors = { honey:'#F5A623', peanut_butter:'#6B4226', peanuts:'#2E7D53' };

    prods.forEach((p,i) => {
      const qty = stock[p.id]||0;
      const x = pad.left + i*gap + (gap-barW)/2;
      const barH = Math.max(2, (qty/max)*chartH);
      const y = pad.top + chartH - barH;
      ctx.fillStyle = catColors[p.category]||'#C8820A';
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.roundRect(x,y,barW,barH,[3,3,0,0]); ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle='#3D2B1F'; ctx.font='9px DM Sans,sans-serif'; ctx.textAlign='center';
      ctx.save(); ctx.translate(x+barW/2, h-8); ctx.rotate(-0.5);
      ctx.fillText(p.id, 0, 0); ctx.restore();
    });
  },

  stockEditModal(productId) {
    const p = DB.getProduct(productId);
    const current = (DB.getStock()[productId] || 0);
    App.openModal(`Adjust Stock — ${p.name}`, `
      <div class="form-group">
        <label class="form-label">Current Stock: <strong>${current} units</strong></label>
      </div>
      <div class="form-group">
        <label class="form-label">New Stock Level (units)</label>
        <input type="number" class="form-control" id="stockQty" value="${current}" min="0">
      </div>
      <div class="form-group">
        <label class="form-label">Reason for Adjustment</label>
        <input type="text" class="form-control" id="stockReason" placeholder="e.g. Restock from supplier">
      </div>
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="Pages.saveStockEdit('${productId}')">Save Stock</button>
      </div>
    `);
  },

  saveStockEdit(productId) {
    const qty = parseInt(document.getElementById('stockQty').value) || 0;
    DB.setStock(productId, qty);
    App.closeModal();
    App.toast('Stock updated!');
    Pages.products();
  },

  stockAdjust() {
    App.openModal('Bulk Stock Adjustment', `
      <p class="text-muted mb-2">Enter new stock quantities for each product (leave blank to keep current).</p>
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Product</th><th>Current</th><th>New Qty</th></tr></thead>
          <tbody>
            ${DB.PRODUCTS.map(p => {
              const q = DB.getStock()[p.id]||0;
              return `<tr>
                <td>${p.icon} ${p.name}</td>
                <td>${q}</td>
                <td><input type="number" class="form-control" style="padding:5px 8px" data-pid="${p.id}" min="0" placeholder="${q}"></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="Pages.saveBulkStock()">Save All</button>
      </div>
    `, true);
  },

  saveBulkStock() {
    document.querySelectorAll('[data-pid]').forEach(inp => {
      if (inp.value !== '') DB.setStock(inp.dataset.pid, parseInt(inp.value)||0);
    });
    App.closeModal(); App.toast('Stock updated for all products!');
    Pages.products();
  },

  updatePricesModal() {
    App.openModal('Update Product Prices', `
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Product</th><th>Current Price (KES)</th><th>New Price (KES)</th></tr></thead>
          <tbody>
            ${DB.PRODUCTS.map(p => `<tr>
              <td>${p.icon} ${p.name}</td>
              <td>${p.price}</td>
              <td><input type="number" class="form-control" style="padding:5px 8px" data-priceid="${p.id}" min="0" placeholder="${p.price}"></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="Pages.savePrices()">Update Prices</button>
      </div>
    `, true);
  },

  savePrices() {
    document.querySelectorAll('[data-priceid]').forEach(inp => {
      if (inp.value) {
        const p = DB.PRODUCTS.find(x => x.id === inp.dataset.priceid);
        if (p) p.price = parseFloat(inp.value)||p.price;
      }
    });
    App.closeModal(); App.toast('Prices updated!');
    Pages.products();
  },

  // ---- CUSTOMERS ----
  customers() {
    const list = DB.getCustomers();
    const outstanding = DB.getOutstandingCustomers();
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="section-header">
        <div class="section-title">Customers (${list.length})</div>
        <button class="btn-primary" onclick="Pages.addCustomerModal()">+ Add Customer</button>
      </div>
      <div class="toolbar">
        <div class="search-box">
          <input type="text" placeholder="Search customers..." id="custSearch" oninput="Pages.filterCustomers(this.value)">
        </div>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table id="custTable">
            <thead><tr>
              <th>Name</th><th>Phone</th><th>Email</th><th>Address</th>
              <th>Orders</th><th>Balance</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${list.map(c => {
                const orders = DB.getOrders().filter(o => o.customerId === c.id);
                const ob = outstanding.find(o => o.customerId === c.id);
                const balance = ob ? ob.balance : 0;
                return `<tr data-cust-name="${c.name.toLowerCase()}">
                  <td><strong>${c.name}</strong></td>
                  <td>${c.phone||'—'}</td>
                  <td>${c.email||'—'}</td>
                  <td>${c.address||'—'}</td>
                  <td><span class="badge badge-info">${orders.length}</span></td>
                  <td>${balance > 0 ? `<span style="color:#C0392B;font-weight:700">${DB.fmtMoney(balance)}</span>` : '<span class="badge badge-success">Settled</span>'}</td>
                  <td>
                    <button class="btn-secondary btn-xs" onclick="Pages.viewCustomer('${c.id}')">View</button>
                    <button class="btn-ghost btn-xs" onclick="Pages.editCustomerModal('${c.id}')">Edit</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  filterCustomers(q) {
    document.querySelectorAll('#custTable tbody tr').forEach(row => {
      row.style.display = row.dataset.custName.includes(q.toLowerCase()) ? '' : 'none';
    });
  },

  addCustomerModal() {
    App.openModal('Add New Customer', `
      <div class="form-group"><label class="form-label">Full Name / Business Name *</label>
        <input type="text" class="form-control" id="cName" placeholder="e.g. Mama Wanjiku Stores">
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Phone</label>
          <input type="text" class="form-control" id="cPhone" placeholder="07XXXXXXXX">
        </div>
        <div class="form-group"><label class="form-label">Email</label>
          <input type="email" class="form-control" id="cEmail" placeholder="email@example.com">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Address</label>
        <input type="text" class="form-control" id="cAddress" placeholder="e.g. Karen, Nairobi">
      </div>
      <div class="form-group"><label class="form-label">Notes</label>
        <textarea class="form-control" id="cNotes" rows="2" placeholder="Optional notes..."></textarea>
      </div>
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="Pages.saveNewCustomer()">Add Customer</button>
      </div>
    `);
  },

  saveNewCustomer() {
    const name = document.getElementById('cName').value.trim();
    if (!name) { App.toast('Name is required','error'); return; }
    DB.addCustomer({
      name,
      phone: document.getElementById('cPhone').value,
      email: document.getElementById('cEmail').value,
      address: document.getElementById('cAddress').value,
      notes: document.getElementById('cNotes').value,
    });
    App.closeModal(); App.toast('Customer added!');
    Pages.customers();
  },

  editCustomerModal(id) {
    const c = DB.getCustomer(id);
    App.openModal('Edit Customer', `
      <div class="form-group"><label class="form-label">Name *</label>
        <input type="text" class="form-control" id="ecName" value="${c.name||''}">
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Phone</label>
          <input type="text" class="form-control" id="ecPhone" value="${c.phone||''}">
        </div>
        <div class="form-group"><label class="form-label">Email</label>
          <input type="email" class="form-control" id="ecEmail" value="${c.email||''}">
        </div>
      </div>
      <div class="form-group"><label class="form-label">Address</label>
        <input type="text" class="form-control" id="ecAddress" value="${c.address||''}">
      </div>
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="Pages.saveEditCustomer('${id}')">Save Changes</button>
      </div>
    `);
  },

  saveEditCustomer(id) {
    DB.updateCustomer(id, {
      name: document.getElementById('ecName').value,
      phone: document.getElementById('ecPhone').value,
      email: document.getElementById('ecEmail').value,
      address: document.getElementById('ecAddress').value,
    });
    App.closeModal(); App.toast('Customer updated!');
    Pages.customers();
  },

  viewCustomer(id) {
    const c = DB.getCustomer(id);
    const orders = DB.getOrders().filter(o => o.customerId === id);
    const totalBilled = orders.reduce((s,o) => s+o.total, 0);
    const totalPaid = orders.reduce((s,o) => s+(o.amountPaid||0), 0);
    App.openModal(`Customer — ${c.name}`, `
      <div class="grid-2" style="margin-bottom:16px">
        <div>
          <p class="text-muted">Phone</p><p><strong>${c.phone||'—'}</strong></p>
          <p class="text-muted mt-1">Email</p><p><strong>${c.email||'—'}</strong></p>
          <p class="text-muted mt-1">Address</p><p><strong>${c.address||'—'}</strong></p>
        </div>
        <div>
          <p class="text-muted">Total Orders</p><p class="stat-value" style="font-size:1.4rem">${orders.length}</p>
          <p class="text-muted mt-1">Total Billed</p><p style="font-weight:700;color:#C8820A">${DB.fmtMoney(totalBilled)}</p>
          <p class="text-muted mt-1">Balance Due</p><p style="font-weight:700;color:#C0392B">${DB.fmtMoney(totalBilled - totalPaid)}</p>
        </div>
      </div>
      <hr class="divider">
      <div class="table-wrapper">
        <table>
          <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead>
          <tbody>
            ${orders.map(o => `<tr>
              <td class="text-mono">${o.id}</td>
              <td>${DB.fmtDate(o.date)}</td>
              <td>${DB.fmtMoney(o.total)}</td>
              <td>${DB.fmtMoney(o.amountPaid)}</td>
              <td>${Pages.payBadge(o.paymentStatus)}</td>
            </tr>`).join('') || '<tr><td colspan="5" class="text-center text-muted">No orders yet</td></tr>'}
          </tbody>
        </table>
      </div>
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Close</button>
        <button class="btn-primary" onclick="App.closeModal();Pages.newOrderModal('${id}')">+ New Order</button>
      </div>
    `, true);
  },

  // ---- ORDERS ----
  orders() {
    const list = [...DB.getOrders()].sort((a,b) => new Date(b.date)-new Date(a.date));
    const content = document.getElementById('pageContent');

    const filterStatus = 'all';
    content.innerHTML = `
      <div class="section-header">
        <div class="section-title">Orders & Sales (${list.length})</div>
        <button class="btn-primary" onclick="Pages.newOrderModal()">+ New Order</button>
      </div>
      <div class="toolbar">
        <div class="search-box">
          <input type="text" placeholder="Search orders..." id="ordSearch" oninput="Pages.filterOrders(this.value)">
        </div>
        <select class="form-control" style="width:160px" onchange="Pages.filterOrdersByStatus(this.value)">
          <option value="all">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table id="ordTable">
            <thead><tr>
              <th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th>
              <th>Paid</th><th>Balance</th><th>Payment</th><th>Date</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${list.map(o => {
                const c = DB.getCustomer(o.customerId);
                const balance = o.total - (o.amountPaid||0);
                return `<tr data-pay-status="${o.paymentStatus}" data-ord-id="${o.id.toLowerCase()}">
                  <td class="text-mono">${o.id}</td>
                  <td>${c ? c.name : '—'}</td>
                  <td><span class="badge badge-neutral">${o.items.length} items</span></td>
                  <td><strong>${DB.fmtMoney(o.total)}</strong></td>
                  <td>${DB.fmtMoney(o.amountPaid)}</td>
                  <td style="color:${balance>0?'#C0392B':'#2E7D53'};font-weight:700">${balance>0?DB.fmtMoney(balance):'✓ Clear'}</td>
                  <td>${Pages.payBadge(o.paymentStatus)}</td>
                  <td>${DB.fmtDate(o.date)}</td>
                  <td>
                    <button class="btn-secondary btn-xs" onclick="Pages.viewOrderModal('${o.id}')">View</button>
                    <button class="btn-ghost btn-xs" onclick="Pages.addPaymentModal('${o.id}')">Pay</button>
                    <button class="btn-xs btn-secondary" onclick="Pages.printInvoice('${o.id}')">🖨️</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  filterOrders(q) {
    document.querySelectorAll('#ordTable tbody tr').forEach(row => {
      row.style.display = row.dataset.ordId.includes(q.toLowerCase()) ? '' : 'none';
    });
  },

  filterOrdersByStatus(status) {
    document.querySelectorAll('#ordTable tbody tr').forEach(row => {
      row.style.display = (status === 'all' || row.dataset.payStatus === status) ? '' : 'none';
    });
  },

  // Order builder state
  orderItems: [],

  newOrderModal(preCustomerId = null) {
    Pages.orderItems = [{ productId: '', qty: 1, unitPrice: 0 }];
    const customers = DB.getCustomers();

    App.openModal('New Order / Sale', `
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Customer *</label>
          <select class="form-control" id="orderCust">
            <option value="">— Select Customer —</option>
            ${customers.map(c => `<option value="${c.id}" ${c.id===preCustomerId?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Order Date</label>
          <input type="date" class="form-control" id="orderDate" value="${new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      <hr class="divider">
      <div class="section-header mb-1">
        <span style="font-weight:700;color:#3D2B1F">Order Items</span>
        <button class="btn-ghost btn-sm" onclick="Pages.addOrderItem()">+ Add Item</button>
      </div>
      <div id="orderItemsContainer"></div>
      <div class="order-total-row">
        <div style="text-align:right">
          <div style="font-size:.82rem;color:#7A6654;margin-bottom:4px">Subtotal: <span id="orderSubtotalDisplay">KES 0.00</span> &nbsp;+&nbsp; VAT 16%</div>
          <div style="display:flex;align-items:center;gap:12px;justify-content:flex-end">
            <span class="order-total-label">ORDER TOTAL (incl. VAT):</span>
            <span class="order-total-value" id="orderTotalDisplay">KES 0.00</span>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-control" id="orderNotes" rows="2" placeholder="Optional notes..."></textarea>
      </div>
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn-primary" onclick="Pages.saveOrder()">Create Order</button>
      </div>
    `, true);
    Pages.renderOrderItems();
  },

  renderOrderItems() {
    const container = document.getElementById('orderItemsContainer');
    if (!container) return;
    container.innerHTML = Pages.orderItems.map((item, i) => `
      <div class="order-item-row">
        <div class="form-group" style="margin:0">
          <label class="form-label">Product</label>
          <select class="form-control" onchange="Pages.onProductSelect(${i}, this.value)">
            <option value="">— Select Product —</option>
            ${['honey','peanut_butter','peanuts'].map(cat => `
              <optgroup label="${cat.replace('_',' ').toUpperCase()}">
                ${DB.PRODUCTS.filter(p=>p.category===cat).map(p=>`
                  <option value="${p.id}" ${item.productId===p.id?'selected':''}>${p.icon} ${p.name}</option>
                `).join('')}
              </optgroup>
            `).join('')}
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Unit Price (KES)</label>
          <input type="number" class="form-control" value="${item.unitPrice}" min="0" step="0.01"
            onchange="Pages.orderItems[${i}].unitPrice=parseFloat(this.value)||0;Pages.updateOrderTotal()">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Qty</label>
          <input type="number" class="form-control" value="${item.qty}" min="1"
            onchange="Pages.orderItems[${i}].qty=parseInt(this.value)||1;Pages.updateOrderTotal()">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Subtotal</label>
          <input type="text" class="form-control" readonly value="${DB.fmtMoney(item.qty * item.unitPrice)}" style="background:#f5f0e8">
        </div>
        <div class="form-group" style="margin:0;padding-top:22px">
          ${Pages.orderItems.length > 1 ? `<button class="btn-danger btn-xs" onclick="Pages.removeOrderItem(${i})">✕</button>` : ''}
        </div>
      </div>
    `).join('');
    Pages.updateOrderTotal();
  },

  addOrderItem() {
    Pages.orderItems.push({ productId:'', qty:1, unitPrice:0 });
    Pages.renderOrderItems();
  },

  removeOrderItem(i) {
    Pages.orderItems.splice(i, 1);
    Pages.renderOrderItems();
  },

  onProductSelect(i, productId) {
    const p = DB.getProduct(productId);
    Pages.orderItems[i].productId = productId;
    Pages.orderItems[i].unitPrice = p ? p.price : 0;
    Pages.renderOrderItems();
  },

  updateOrderTotal() {
    const subtotal = Pages.orderItems.reduce((s,i) => s + i.qty * i.unitPrice, 0);
    const vat = subtotal * 0.16;
    const grand = subtotal + vat;
    const el = document.getElementById('orderTotalDisplay');
    if (el) el.innerHTML = `${DB.fmtMoney(grand)} <span style="font-size:.75rem;font-weight:500;color:#7A6654">(incl. VAT ${DB.fmtMoney(vat)})</span>`;
    const sub = document.getElementById('orderSubtotalDisplay');
    if (sub) sub.textContent = DB.fmtMoney(subtotal);
  },

  saveOrder() {
    const custId = document.getElementById('orderCust').value;
    if (!custId) { App.toast('Please select a customer','error'); return; }
    const validItems = Pages.orderItems.filter(i => i.productId && i.qty > 0);
    if (!validItems.length) { App.toast('Add at least one product','error'); return; }
    const subtotal = DB.calcOrderTotal(validItems);
    const vat = subtotal * 0.16;
    const total = subtotal + vat;
    const order = DB.addOrder({
      customerId: custId,
      items: validItems,
      subtotal,
      vat,
      total,
      notes: document.getElementById('orderNotes').value,
    });
    App.closeModal();
    App.toast(`Order ${order.id} created! Total: ${DB.fmtMoney(total)}`);
    Pages.orders();
    // Switch page
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector('[data-page="orders"]').classList.add('active');
    document.getElementById('pageTitle').textContent = 'Orders & Sales';
  },

  viewOrderModal(orderId) {
    const o = DB.getOrder(orderId);
    const c = DB.getCustomer(o.customerId);
    const payments = DB.getOrderPayments(orderId);
    const balance = o.total - (o.amountPaid||0);
    App.openModal(`Order — ${o.id}`, `
      <div class="grid-2" style="margin-bottom:16px">
        <div>
          <p class="text-muted">Customer</p><p><strong>${c?c.name:'—'}</strong></p>
          <p class="text-muted mt-1">Phone</p><p>${c?c.phone:'—'}</p>
          <p class="text-muted mt-1">Date</p><p>${DB.fmtDate(o.date)}</p>
        </div>
        <div>
          <p class="text-muted">Total</p><p style="font-family:Playfair Display,serif;font-size:1.3rem;font-weight:700;color:#C8820A">${DB.fmtMoney(o.total)}</p>
          <p class="text-muted mt-1" style="font-size:.78rem">Subtotal: ${DB.fmtMoney(o.subtotal||o.total/1.16)} + VAT(16%): ${DB.fmtMoney(o.vat||(o.total - o.total/1.16))}</p>
          <p class="text-muted mt-1">Paid</p><p style="color:#2E7D53;font-weight:700">${DB.fmtMoney(o.amountPaid)}</p>
          <p class="text-muted mt-1">Balance</p><p style="color:${balance>0?'#C0392B':'#2E7D53'};font-weight:700">${balance>0?DB.fmtMoney(balance):'✓ Cleared'}</p>
        </div>
      </div>
      <hr class="divider">
      <strong>Items</strong>
      <div class="table-wrapper mt-1">
        <table>
          <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${o.items.map(item => {
              const p = DB.getProduct(item.productId);
              return `<tr>
                <td>${p ? p.icon+' '+p.name : item.productId}</td>
                <td>${item.qty}</td>
                <td>${DB.fmtMoney(item.unitPrice)}</td>
                <td><strong>${DB.fmtMoney(item.qty*item.unitPrice)}</strong></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${payments.length ? `
        <hr class="divider">
        <strong>Payments Received</strong>
        <div class="table-wrapper mt-1">
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead>
            <tbody>
              ${payments.map(p => `<tr>
                <td>${DB.fmtDate(p.date)}</td>
                <td><strong>${DB.fmtMoney(p.amount)}</strong></td>
                <td>${p.method}</td>
                <td class="text-mono">${p.reference||'—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Close</button>
        ${balance>0 ? `<button class="btn-success" onclick="App.closeModal();Pages.addPaymentModal('${orderId}')">Record Payment</button>` : ''}
        <button class="btn-primary" onclick="Pages.printInvoice('${orderId}')">🖨️ Print Invoice</button>
        <button class="btn-ghost" onclick="Pages.issueCreditNoteModal('${orderId}')">Issue Credit Note</button>
      </div>
    `, true);
  },

  // ---- PAYMENTS ----
  payments() {
    const outstanding = DB.getOutstandingCustomers();
    const allPayments = [...DB.getPayments()].sort((a,b) => new Date(b.date)-new Date(a.date));
    const content = document.getElementById('pageContent');

    content.innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat-card red">
          <div class="stat-label">Outstanding Customers</div>
          <div class="stat-value">${outstanding.length}</div>
          <div class="stat-sub">With unpaid/partial orders</div>
        </div>
        <div class="stat-card green">
          <div class="stat-label">Total Received</div>
          <div class="stat-value">${DB.fmtMoney(allPayments.reduce((s,p)=>s+p.amount,0)).replace('KES ','')}</div>
          <div class="stat-sub">KES across all payments</div>
        </div>
        <div class="stat-card honey">
          <div class="stat-label">Payments Recorded</div>
          <div class="stat-value">${allPayments.length}</div>
          <div class="stat-sub">Total transactions</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-title">Outstanding Balances
            <button class="btn-primary btn-sm" onclick="Pages.recordPaymentForm()">+ Record Payment</button>
          </div>
          ${outstanding.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-title">All payments settled!</div></div>` : `
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Customer</th><th>Orders</th><th>Balance Due</th><th>Action</th></tr></thead>
              <tbody>
                ${outstanding.map(ob => {
                  const c = DB.getCustomer(ob.customerId);
                  return `<tr>
                    <td><strong>${c?c.name:'Unknown'}</strong></td>
                    <td>${ob.orders.length} order(s)</td>
                    <td style="color:#C0392B;font-weight:700">${DB.fmtMoney(ob.balance)}</td>
                    <td><button class="btn-success btn-xs" onclick="Pages.payForCustomer('${ob.customerId}')">Pay Now</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`}
        </div>

        <div class="card">
          <div class="card-title">Recent Payments</div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Date</th><th>Order</th><th>Amount</th><th>Method</th></tr></thead>
              <tbody>
                ${allPayments.slice(0,10).map(p => {
                  const o = DB.getOrder(p.orderId);
                  const c = o ? DB.getCustomer(o.customerId) : null;
                  return `<tr>
                    <td>${DB.fmtDate(p.date)}</td>
                    <td class="text-mono">${p.orderId}</td>
                    <td><strong>${DB.fmtMoney(p.amount)}</strong></td>
                    <td><span class="badge badge-info">${p.method}</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  payForCustomer(customerId) {
    const orders = DB.getOrders().filter(o => o.customerId === customerId && o.paymentStatus !== 'paid');
    const c = DB.getCustomer(customerId);
    if (!orders.length) { App.toast('No unpaid orders','error'); return; }
    App.openModal(`Record Payment — ${c?c.name:''}`, `
      <div class="form-group">
        <label class="form-label">Order *</label>
        <select class="form-control" id="payOrderId">
          ${orders.map(o => `<option value="${o.id}">${o.id} — Balance: ${DB.fmtMoney(o.total-(o.amountPaid||0))}</option>`).join('')}
        </select>
      </div>
      ${Pages.paymentFields()}
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn-success" onclick="Pages.submitPayment()">Record Payment</button>
      </div>
    `);
  },

  addPaymentModal(orderId) {
    const o = DB.getOrder(orderId);
    const balance = o.total - (o.amountPaid||0);
    App.openModal(`Record Payment — ${orderId}`, `
      <div class="alert alert-warning">Balance Due: <strong>${DB.fmtMoney(balance)}</strong></div>
      <input type="hidden" id="payOrderId" value="${orderId}">
      ${Pages.paymentFields(balance)}
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn-success" onclick="Pages.submitPayment()">Record Payment</button>
      </div>
    `);
  },

  paymentFields(suggestedAmount = '') {
    return `
      <div class="form-row">
        <div class="form-group"><label class="form-label">Amount (KES) *</label>
          <input type="number" class="form-control" id="payAmount" value="${suggestedAmount}" placeholder="0.00" min="0" step="0.01">
        </div>
        <div class="form-group"><label class="form-label">Payment Method</label>
          <select class="form-control" id="payMethod">
            <option>M-Pesa</option>
            <option>Cash</option>
            <option>Bank Transfer</option>
            <option>Cheque</option>
            <option>Credit Card</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label class="form-label">Reference / Transaction Code</label>
        <input type="text" class="form-control" id="payRef" placeholder="e.g. QDK1234 for M-Pesa">
      </div>
      <div class="form-group"><label class="form-label">Notes</label>
        <input type="text" class="form-control" id="payNotes" placeholder="Optional note">
      </div>
    `;
  },

  recordPaymentForm() {
    const orders = DB.getOrders().filter(o => o.paymentStatus !== 'paid');
    App.openModal('Record Payment', `
      <div class="form-group"><label class="form-label">Order *</label>
        <select class="form-control" id="payOrderId">
          <option value="">— Select Order —</option>
          ${orders.map(o => {
            const c = DB.getCustomer(o.customerId);
            const bal = o.total-(o.amountPaid||0);
            return `<option value="${o.id}">${o.id} — ${c?c.name:''} — Balance: ${DB.fmtMoney(bal)}</option>`;
          }).join('')}
        </select>
      </div>
      ${Pages.paymentFields()}
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn-success" onclick="Pages.submitPayment()">Record Payment</button>
      </div>
    `);
  },

  submitPayment() {
    const orderId = document.getElementById('payOrderId').value;
    const amount = parseFloat(document.getElementById('payAmount').value)||0;
    if (!orderId || !amount) { App.toast('Order and amount are required','error'); return; }
    DB.addPayment({
      orderId,
      amount,
      method: document.getElementById('payMethod').value,
      reference: document.getElementById('payRef').value,
      notes: document.getElementById('payNotes') ? document.getElementById('payNotes').value : '',
    });
    App.closeModal(); App.toast(`Payment of ${DB.fmtMoney(amount)} recorded!`);
    Pages.payments();
  },

  // ---- INVOICES ----
  invoices() {
    const orders = [...DB.getOrders()].sort((a,b) => new Date(b.date)-new Date(a.date));
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="section-header">
        <div class="section-title">Invoices (${orders.length})</div>
      </div>
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>Invoice #</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Action</th>
            </tr></thead>
            <tbody>
              ${orders.map(o => {
                const c = DB.getCustomer(o.customerId);
                return `<tr>
                  <td class="text-mono">INV-${o.id.replace('ORD-','')}</td>
                  <td>${c?c.name:'—'}</td>
                  <td>${DB.fmtDate(o.date)}</td>
                  <td><strong>${DB.fmtMoney(o.total)}</strong></td>
                  <td>${Pages.payBadge(o.paymentStatus)}</td>
                  <td>
                    <button class="btn-primary btn-xs" onclick="Pages.printInvoice('${o.id}')">🖨️ Print</button>
                    <button class="btn-secondary btn-xs" onclick="Pages.viewOrderModal('${o.id}')">View</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  printInvoice(orderId) {
    const o = DB.getOrder(orderId);
    const c = DB.getCustomer(o.customerId);
    const balance = o.total - (o.amountPaid||0);
    const html = Pages.buildDocHTML('INVOICE', `INV-${orderId.replace('ORD-','')}`, o, c, balance);
    Pages.printDoc(html);
  },

  // ---- SHARED LETTERHEAD HTML ----
  letterheadCSS(accentColor) {
    return `
      * { box-sizing:border-box; margin:0; padding:0; }
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;600;700&family=DM+Mono:wght@400;500&display=swap');
      html, body { height:100%; }
      body {
        font-family:'DM Sans',Arial,sans-serif;
        color:#1A1209;
        background:#fff;
        font-size:13px;
        min-height:100%;
        position:relative;
      }
      /* ---- PAGE BORDER (letterhead frame) ---- */
      .page-frame {
        min-height:96vh;
        border: 2.5px solid #C0392B;
        border-right: 12px solid #8DC63F;
        border-radius: 18px;
        padding: 0 28px 0 28px;
        position: relative;
        display: flex;
        flex-direction: column;
      }
      /* Bottom-left red arc accent */
      .page-frame::after {
        content:'';
        position:absolute;
        bottom:-2px; left:-2px;
        width:60px; height:40px;
        border-bottom: 3px solid #C0392B;
        border-left: 3px solid #C0392B;
        border-bottom-left-radius: 18px;
        pointer-events:none;
      }
      /* ---- LETTERHEAD HEADER ---- */
      .lh-header {
        display:flex;
        align-items:center;
        padding: 18px 0 10px 0;
        border-bottom: 1.5px solid #ddd;
        margin-bottom: 6px;
        gap: 16px;
      }
      /* NC Logo block */
      .lh-logo {
        flex-shrink:0;
        width:64px; height:64px;
        position:relative;
      }
      .lh-logo svg { width:64px; height:64px; }
      .lh-company {
        flex:1;
        text-align:center;
      }
      .lh-company-name {
        font-family:'Arial Black',Impact,sans-serif;
        font-size:26px;
        font-weight:900;
        font-style:italic;
        color:#C0392B;
        letter-spacing:1px;
        line-height:1.1;
        text-transform:uppercase;
      }
      /* Wave divider (decorative green swirls) */
      .lh-wave {
        display:flex;
        justify-content:center;
        gap:4px;
        margin:3px 0 4px 0;
      }
      .lh-wave span {
        display:inline-block;
        width:28px; height:8px;
        border-bottom:3px solid #8DC63F;
        border-radius:0 0 50% 50% / 0 0 8px 8px;
        transform:scaleX(1.2);
      }
      .lh-contact {
        font-size:11.5px;
        color:#333;
        text-align:center;
        line-height:1.7;
      }
      /* ---- DOC TYPE BANNER ---- */
      .doc-banner {
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        margin: 14px 0 16px 0;
        padding-bottom:10px;
        border-bottom: 2px solid ${accentColor};
      }
      .doc-type-title {
        font-size:20px;
        font-weight:800;
        letter-spacing:2px;
        text-transform:uppercase;
        color:${accentColor};
      }
      .doc-meta-right {
        text-align:right;
        font-size:12px;
        color:#555;
        line-height:1.8;
      }
      .doc-meta-right strong { color:#1A1209; font-size:13px; }
      /* ---- BILL TO / META GRID ---- */
      .meta { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-bottom:20px; }
      .meta-label { font-size:10px; text-transform:uppercase; letter-spacing:1px; color:#888; margin-bottom:3px; font-weight:600; }
      .meta-value { font-weight:600; color:#1A1209; font-size:13px; }
      .meta-sub { color:#666; font-size:12px; margin-top:1px; }
      /* ---- TABLE ---- */
      table { width:100%; border-collapse:collapse; margin:16px 0; }
      thead th {
        background:#2C2C2C;
        color:#fff;
        padding:9px 12px;
        text-align:left;
        font-size:11px;
        font-weight:700;
        letter-spacing:0.5px;
        text-transform:uppercase;
      }
      tbody td { padding:9px 12px; border-bottom:1px solid #E8DCC8; font-size:12.5px; }
      tbody tr:nth-child(even) td { background:#FAFAF5; }
      /* ---- TOTALS ---- */
      .totals { margin-left:auto; width:270px; margin-top:8px; }
      .total-row { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #E8DCC8; font-size:12.5px; }
      .grand-total {
        font-size:15px; font-weight:800;
        color:${accentColor};
        border-top:2.5px solid ${accentColor};
        border-bottom:none;
        padding-top:9px; margin-top:4px;
      }
      /* ---- BADGES ---- */
      .badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:600; }
      .badge-paid { background:#E8F5ED; color:#2E7D53; }
      .badge-partial { background:#FEF9E7; color:#B7950B; }
      .badge-unpaid { background:#FDECEA; color:#C0392B; }
      /* ---- NOTES ---- */
      .note-box { background:#FAFAF5; border-left:4px solid ${accentColor}; padding:10px 14px; margin-top:16px; font-size:12px; border-radius:0 6px 6px 0; }
      /* ---- FOOTER ---- */
      .lh-footer {
        margin-top:auto;
        padding: 14px 0 18px 0;
        border-top:1px solid #ddd;
        font-size:11px;
        color:#888;
        text-align:center;
        line-height:1.8;
      }
      /* ---- SUMMARY BOX ---- */
      .summary { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; margin:16px 0; padding:14px 16px; background:#FAFAF5; border-radius:8px; border:1px solid #E8DCC8; }
      @media print {
        body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        .page-frame { min-height:98vh; }
      }
    `;
  },

  letterheadHTML() {
    // SVG recreation of the NC logo
    return `
      <div class="lh-header">
        <div class="lh-logo">
          <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <!-- Outer circle arc (left) -->
            <path d="M8,52 Q2,32 8,12" stroke="#1A1209" stroke-width="3.5" fill="none" stroke-linecap="round"/>
            <!-- N letterform -->
            <text x="10" y="42" font-family="Arial Black,sans-serif" font-size="28" font-weight="900" fill="#1A1209">N</text>
            <!-- C letterform -->
            <text x="32" y="42" font-family="Arial Black,sans-serif" font-size="22" font-weight="900" fill="#1A1209">C</text>
            <!-- Horizontal bar (the dash in the logo) -->
            <rect x="10" y="45" width="42" height="4" rx="2" fill="#1A1209"/>
          </svg>
        </div>
        <div class="lh-company">
          <div class="lh-company-name">NURTURED CHOICE PRODUCTS</div>
          <div class="lh-wave">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <div class="lh-contact">
            P.O Box 28675 - 00200 Nairobi, Kenya.<br>
            Tel: +254 726 441 206 &nbsp;&nbsp; Email: nurturedchoice@yahoo.com
          </div>
        </div>
      </div>
    `;
  },

  buildDocHTML(type, docNum, order, customer, balance, creditNote = null) {
    const isCredit = type === 'CREDIT NOTE';
    const accentColor = isCredit ? '#C0392B' : '#2C7A2C';
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>${type} — ${docNum}</title>
    <style>${Pages.letterheadCSS(accentColor)}</style>
    </head><body>
    <div class="page-frame">

      ${Pages.letterheadHTML()}

      <div class="doc-banner">
        <div class="doc-type-title">${type}</div>
        <div class="doc-meta-right">
          <strong># ${docNum}</strong><br>
          Date: ${DB.fmtDate(order.date)}<br>
          Printed: ${DB.fmtDate(new Date().toISOString())}
        </div>
      </div>

      <div class="meta">
        <div>
          <div class="meta-label">Bill To</div>
          <div class="meta-value">${customer ? customer.name : '—'}</div>
          <div class="meta-sub">${customer ? customer.phone||'' : ''}</div>
          <div class="meta-sub">${customer ? customer.address||'' : ''}</div>
          <div class="meta-sub">${customer ? customer.email||'' : ''}</div>
        </div>
        <div>
          <div class="meta-label">Order Reference</div>
          <div class="meta-value">${order.id}</div>
          ${creditNote ? `<div class="meta-label" style="margin-top:10px">Credit Reason</div>
          <div style="color:#C0392B;font-size:12px;font-weight:600">${creditNote.reason||'—'}</div>` : ''}
        </div>
        <div>
          <div class="meta-label">Payment Status</div>
          <span class="badge badge-${order.paymentStatus||'unpaid'}">${(order.paymentStatus||'unpaid').toUpperCase()}</span>
          ${!isCredit ? `
          <div class="meta-label" style="margin-top:10px">Amount Paid</div>
          <div class="meta-value" style="color:#2E7D53">${DB.fmtMoney(order.amountPaid)}</div>
          <div class="meta-label" style="margin-top:6px">Balance Due</div>
          <div class="meta-value" style="color:${balance>0?'#C0392B':'#2E7D53'}">${DB.fmtMoney(balance)}</div>
          ` : ''}
        </div>
      </div>

      <table>
        <thead><tr>
          <th style="width:32px">#</th>
          <th>Description</th>
          <th style="width:50px;text-align:center">Qty</th>
          <th style="width:110px;text-align:right">Unit Price</th>
          <th style="width:120px;text-align:right">Amount</th>
        </tr></thead>
        <tbody>
          ${order.items.map((item, i) => {
            const p = DB.getProduct(item.productId);
            return `<tr>
              <td>${i+1}</td>
              <td>${p ? p.name : item.productId}</td>
              <td style="text-align:center">${item.qty}</td>
              <td style="text-align:right">${DB.fmtMoney(item.unitPrice)}</td>
              <td style="text-align:right"><strong>${DB.fmtMoney(item.qty * item.unitPrice)}</strong></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      ${(() => {
        const subtotal = order.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
        const vatAmt = subtotal * 0.16;
        const grandTotal = subtotal + vatAmt;
        const balanceDue = grandTotal - (order.amountPaid || 0);
        return `
        <div class="totals">
          <div class="total-row"><span>Subtotal (excl. VAT)</span><span>${DB.fmtMoney(subtotal)}</span></div>
          <div class="total-row" style="color:#C8820A;font-weight:600">
            <span>VAT @ 16%</span><span>${DB.fmtMoney(vatAmt)}</span>
          </div>
          <div class="total-row" style="font-weight:700">
            <span>Grand Total (incl. VAT)</span><span>${DB.fmtMoney(grandTotal)}</span>
          </div>
          ${!isCredit ? `<div class="total-row"><span>Amount Paid</span><span style="color:#2E7D53">${DB.fmtMoney(order.amountPaid)}</span></div>` : ''}
          <div class="total-row grand-total">
            <span>${isCredit ? 'CREDIT AMOUNT' : 'BALANCE DUE'}</span>
            <span>${isCredit ? DB.fmtMoney(grandTotal) : DB.fmtMoney(balanceDue)}</span>
          </div>
        </div>`;
      })()}

      ${order.notes ? `<div class="note-box"><strong>Notes:</strong> ${order.notes}</div>` : ''}

      <div class="lh-footer">
        Thank you for choosing Nurtured Choice Products!<br>
        P.O Box 28675 - 00200 Nairobi, Kenya &nbsp;|&nbsp; Tel: +254 726 441 206 &nbsp;|&nbsp; nurturedchoice@yahoo.com
      </div>

    </div>
    </body></html>`;
  },

  printDoc(html) {
    const frame = document.getElementById('printFrame');
    frame.src = 'about:blank';
    frame.onload = null;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    frame.src = url;
    frame.onload = () => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    };
  },

  printStatement(customerId) {
    const c = DB.getCustomer(customerId);
    const orders = DB.getOrders().filter(o => o.customerId === customerId);
    const payments = DB.getPayments().filter(p => orders.find(o => o.id === p.orderId));
    const totalBilled = orders.reduce((s,o)=>s+o.total,0);
    const totalPaid = orders.reduce((s,o)=>s+(o.amountPaid||0),0);
    const balance = totalBilled - totalPaid;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Account Statement</title>
    <style>
      ${Pages.letterheadCSS('#1A6B8A')}
      strong.section-head { display:block; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#1A1209; margin:18px 0 6px 0; border-bottom:1.5px solid #E8DCC8; padding-bottom:4px; }
    </style>
    </head><body>
    <div class="page-frame">

      ${Pages.letterheadHTML()}

      <div class="doc-banner">
        <div class="doc-type-title">ACCOUNT STATEMENT</div>
        <div class="doc-meta-right">
          Printed: ${DB.fmtDate(new Date().toISOString())}<br>
          <strong>${c ? c.name : customerId}</strong>
        </div>
      </div>

      <div style="font-size:12.5px;margin-bottom:14px;color:#444">
        <strong>${c?c.name:customerId}</strong>
        ${c&&c.phone ? ` &nbsp;|&nbsp; Tel: ${c.phone}` : ''}
        ${c&&c.address ? ` &nbsp;|&nbsp; ${c.address}` : ''}
        ${c&&c.email ? ` &nbsp;|&nbsp; ${c.email}` : ''}
      </div>

      <div class="summary">
        <div>
          <div class="meta-label">Total Billed</div>
          <div style="font-size:20px;font-weight:800;color:#1A1209">${DB.fmtMoney(totalBilled)}</div>
        </div>
        <div>
          <div class="meta-label">Total Paid</div>
          <div style="font-size:20px;font-weight:800;color:#2E7D53">${DB.fmtMoney(totalPaid)}</div>
        </div>
        <div>
          <div class="meta-label">Balance Due</div>
          <div style="font-size:20px;font-weight:800;color:${balance>0?'#C0392B':'#2E7D53'}">${DB.fmtMoney(balance)}</div>
        </div>
      </div>

      <strong class="section-head">Order History</strong>
      <table>
        <thead><tr><th>Order ID</th><th>Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
        <tbody>
          ${orders.map(o => `<tr>
            <td style="font-family:monospace">${o.id}</td>
            <td>${DB.fmtDate(o.date)}</td>
            <td>${DB.fmtMoney(o.total)}</td>
            <td style="color:#2E7D53">${DB.fmtMoney(o.amountPaid)}</td>
            <td style="color:${o.total-(o.amountPaid||0)>0?'#C0392B':'#2E7D53'};font-weight:700">${DB.fmtMoney(o.total-(o.amountPaid||0))}</td>
            <td><span class="badge badge-${o.paymentStatus}">${o.paymentStatus}</span></td>
          </tr>`).join('')}
        </tbody>
      </table>

      <strong class="section-head">Payment History</strong>
      <table>
        <thead><tr><th>Date</th><th>Order</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead>
        <tbody>
          ${payments.length ? payments.map(p => `<tr>
            <td>${DB.fmtDate(p.date)}</td>
            <td style="font-family:monospace">${p.orderId}</td>
            <td style="color:#2E7D53;font-weight:700">${DB.fmtMoney(p.amount)}</td>
            <td>${p.method}</td>
            <td style="font-family:monospace">${p.reference||'—'}</td>
          </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:#888">No payments recorded</td></tr>'}
        </tbody>
      </table>

      <div class="lh-footer">
        Nurtured Choice Products — Account Statement &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-KE')}<br>
        P.O Box 28675 - 00200 Nairobi, Kenya &nbsp;|&nbsp; Tel: +254 726 441 206 &nbsp;|&nbsp; nurturedchoice@yahoo.com
      </div>

    </div>
    </body></html>`;
    Pages.printDoc(html);
  },

  // ---- CREDIT NOTES ----
  creditNotes() {
    const list = DB.getCreditNotes();
    const content = document.getElementById('pageContent');
    content.innerHTML = `
      <div class="section-header">
        <div class="section-title">Credit Notes (${list.length})</div>
        <button class="btn-primary" onclick="Pages.issueCreditNoteModal()">Issue Credit Note</button>
      </div>
      ${list.length === 0 ? `<div class="card"><div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">No credit notes yet</div>
        <p class="text-muted">Credit notes will appear here when issued</p>
      </div></div>` : `
      <div class="card">
        <div class="table-wrapper">
          <table>
            <thead><tr>
              <th>CN #</th><th>Order Ref</th><th>Customer</th><th>Amount</th><th>Reason</th><th>Date</th><th>Action</th>
            </tr></thead>
            <tbody>
              ${list.map(cn => {
                const o = DB.getOrder(cn.orderId);
                const c = o ? DB.getCustomer(o.customerId) : null;
                return `<tr>
                  <td class="text-mono">${cn.id}</td>
                  <td class="text-mono">${cn.orderId}</td>
                  <td>${c?c.name:'—'}</td>
                  <td style="color:#C0392B;font-weight:700">${DB.fmtMoney(cn.amount)}</td>
                  <td>${cn.reason||'—'}</td>
                  <td>${DB.fmtDate(cn.date)}</td>
                  <td><button class="btn-primary btn-xs" onclick="Pages.printCreditNote('${cn.id}')">🖨️ Print</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`}
    `;
  },

  issueCreditNoteModal(preOrderId = null) {
    const orders = DB.getOrders();
    App.openModal('Issue Credit Note', `
      <div class="form-group"><label class="form-label">Related Order *</label>
        <select class="form-control" id="cnOrderId">
          <option value="">— Select Order —</option>
          ${orders.map(o => {
            const c = DB.getCustomer(o.customerId);
            return `<option value="${o.id}" ${o.id===preOrderId?'selected':''}>${o.id} — ${c?c.name:''} — ${DB.fmtMoney(o.total)}</option>`;
          }).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Credit Amount (KES) *</label>
        <input type="number" class="form-control" id="cnAmount" placeholder="0.00" min="0" step="0.01">
      </div>
      <div class="form-group"><label class="form-label">Reason for Credit Note *</label>
        <input type="text" class="form-control" id="cnReason" placeholder="e.g. Damaged goods, overcharge, return">
      </div>
      <div class="form-group"><label class="form-label">Notes</label>
        <textarea class="form-control" id="cnNotes" rows="2"></textarea>
      </div>
      <div class="modal-footer" style="padding:0;border:none;background:none;margin-top:16px">
        <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>
        <button class="btn-danger" onclick="Pages.saveCreditNote()">Issue Credit Note</button>
      </div>
    `);
  },

  saveCreditNote() {
    const orderId = document.getElementById('cnOrderId').value;
    const amount = parseFloat(document.getElementById('cnAmount').value)||0;
    const reason = document.getElementById('cnReason').value.trim();
    if (!orderId || !amount || !reason) { App.toast('All required fields must be filled','error'); return; }
    const cn = DB.addCreditNote({ orderId, amount, reason, notes: document.getElementById('cnNotes').value });
    App.closeModal(); App.toast(`Credit Note ${cn.id} issued!`);
    Pages.creditNotes();
  },

  printCreditNote(cnId) {
    const cn = DB.getCreditNotes().find(c => c.id === cnId);
    const order = DB.getOrder(cn.orderId);
    const customer = order ? DB.getCustomer(order.customerId) : null;
    const html = Pages.buildDocHTML('CREDIT NOTE', cn.id, order, customer, cn.amount, cn);
    Pages.printDoc(html);
  },

  // ---- REPORTS ----
  reports() {
    const customers = DB.getCustomers();
    const orders = DB.getOrders();
    const payments = DB.getPayments();
    const content = document.getElementById('pageContent');

    content.innerHTML = `
      <div class="section-header">
        <div class="section-title">Reports & Analytics</div>
      </div>

      <div class="tabs">
        <div class="tab active" onclick="Pages.reportTab('outstanding', this)">Outstanding Debtors</div>
        <div class="tab" onclick="Pages.reportTab('statements', this)">Customer Statements</div>
        <div class="tab" onclick="Pages.reportTab('sales', this)">Sales Analytics</div>
        <div class="tab" onclick="Pages.reportTab('stockval', this)">Stock Valuation</div>
      </div>

      <div id="reportContent"></div>
    `;

    Pages.reportTab('outstanding', document.querySelector('.tab.active'));
  },

  reportTab(tab, el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const cont = document.getElementById('reportContent');
    if (!cont) return;

    if (tab === 'outstanding') {
      const outstanding = DB.getOutstandingCustomers();
      cont.innerHTML = `
        <div class="card">
          <div class="card-title">Outstanding Debtors — ${outstanding.length} customers
            <button class="btn-primary btn-sm" onclick="Pages.printOutstandingReport()">🖨️ Print Report</button>
          </div>
          ${outstanding.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">🎉</div><div class="empty-state-title">All accounts are settled!</div></div>' : `
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Customer</th><th>Phone</th><th>Orders Pending</th><th>Total Balance</th><th>Actions</th></tr></thead>
              <tbody>
                ${outstanding.sort((a,b)=>b.balance-a.balance).map(ob => {
                  const c = DB.getCustomer(ob.customerId);
                  return `<tr>
                    <td><strong>${c?c.name:'Unknown'}</strong></td>
                    <td>${c?c.phone:'—'}</td>
                    <td>${ob.orders.length} order(s)</td>
                    <td style="font-size:1.05rem;font-weight:700;color:#C0392B">${DB.fmtMoney(ob.balance)}</td>
                    <td>
                      <button class="btn-success btn-xs" onclick="Pages.payForCustomer('${ob.customerId}')">Record Payment</button>
                      <button class="btn-ghost btn-xs" onclick="Pages.printStatement('${ob.customerId}')">🖨️ Statement</button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`}
        </div>
      `;
    }

    else if (tab === 'statements') {
      cont.innerHTML = `
        <div class="card">
          <div class="card-title">Customer Account Statements</div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Customer</th><th>Phone</th><th>Total Orders</th><th>Total Billed</th><th>Total Paid</th><th>Balance</th><th>Print</th></tr></thead>
              <tbody>
                ${DB.getCustomers().map(c => {
                  const ords = DB.getOrders().filter(o=>o.customerId===c.id);
                  const billed = ords.reduce((s,o)=>s+o.total,0);
                  const paid = ords.reduce((s,o)=>s+(o.amountPaid||0),0);
                  const bal = billed - paid;
                  return `<tr>
                    <td><strong>${c.name}</strong></td>
                    <td>${c.phone||'—'}</td>
                    <td>${ords.length}</td>
                    <td>${DB.fmtMoney(billed)}</td>
                    <td>${DB.fmtMoney(paid)}</td>
                    <td style="color:${bal>0?'#C0392B':'#2E7D53'};font-weight:700">${DB.fmtMoney(bal)}</td>
                    <td><button class="btn-primary btn-xs" onclick="Pages.printStatement('${c.id}')">🖨️ Statement</button></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    else if (tab === 'sales') {
      const byMonth = DB.getSalesByMonth();
      const months = Object.keys(byMonth);
      const vals = months.map(m => byMonth[m]);
      cont.innerHTML = `
        <div class="grid-2">
          <div class="card">
            <div class="card-title">Sales by Month</div>
            <canvas id="reportSalesChart" height="260"></canvas>
          </div>
          <div class="card">
            <div class="card-title">Sales by Category</div>
            <canvas id="reportCatChart" height="260"></canvas>
          </div>
        </div>
        <div class="card mt-2" style="margin-top:20px">
          <div class="card-title">Sales Summary by Product</div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Units Sold</th><th>Revenue</th></tr></thead>
              <tbody>
                ${(() => {
                  const byProd = {};
                  DB.getOrders().forEach(o => o.items.forEach(item => {
                    if (!byProd[item.productId]) byProd[item.productId] = { qty:0, revenue:0 };
                    byProd[item.productId].qty += item.qty;
                    byProd[item.productId].revenue += item.qty * item.unitPrice;
                  }));
                  return DB.PRODUCTS.map(p => {
                    const d = byProd[p.id]||{qty:0,revenue:0};
                    return `<tr>
                      <td>${p.icon} ${p.name}</td>
                      <td>${p.category.replace('_',' ')}</td>
                      <td>${d.qty}</td>
                      <td><strong>${DB.fmtMoney(d.revenue)}</strong></td>
                    </tr>`;
                  }).join('');
                })()}
              </tbody>
            </table>
          </div>
        </div>
      `;
      setTimeout(() => {
        Pages.drawSalesChart(months, vals);
        // reuse as sales chart
        const canvas = document.getElementById('reportSalesChart');
        if (canvas) {
          const c2 = document.getElementById('salesChart');
          if (!c2) {
            // draw directly in report
            Pages.drawSalesChartOn(canvas, months, vals);
          }
        }
        Pages.drawCatChart();
      }, 60);
    }

    else if (tab === 'stockval') {
      const stock = DB.getStock();
      const totalVal = DB.PRODUCTS.reduce((s,p) => s + (stock[p.id]||0)*p.price, 0);
      cont.innerHTML = `
        <div class="card">
          <div class="card-title">Stock Valuation — Total: <span style="color:#C8820A">${DB.fmtMoney(totalVal)}</span></div>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Unit Price</th><th>Stock (units)</th><th>Value</th><th>Status</th></tr></thead>
              <tbody>
                ${DB.PRODUCTS.map(p => {
                  const qty = stock[p.id]||0;
                  const val = qty * p.price;
                  const level = qty>40?'badge-success':qty>20?'badge-warning':'badge-danger';
                  return `<tr>
                    <td>${p.icon} ${p.name}</td>
                    <td>${p.category.replace('_',' ')}</td>
                    <td>${DB.fmtMoney(p.price)}</td>
                    <td><strong>${qty}</strong></td>
                    <td><strong>${DB.fmtMoney(val)}</strong></td>
                    <td><span class="badge ${level}">${qty>40?'Good':qty>20?'Low':'Critical'}</span></td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }
  },

  drawSalesChartOn(canvas, labels, data) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.offsetWidth || 400;
    const h = canvas.height || 260;
    canvas.width = w;
    const pad = { top:20, right:16, bottom:36, left:70 };
    const chartW = w-pad.left-pad.right;
    const chartH = h-pad.top-pad.bottom;
    const max = Math.max(...data, 1);
    const barW = chartW/data.length*0.55;
    const gap = chartW/data.length;
    ctx.clearRect(0,0,w,h);
    [0.25,0.5,0.75,1].forEach(f => {
      const y = pad.top+chartH*(1-f);
      ctx.strokeStyle='#E8DCC8'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(pad.left,y); ctx.lineTo(pad.left+chartW,y); ctx.stroke();
      ctx.fillStyle='#7A6654'; ctx.font='10px DM Mono,monospace'; ctx.textAlign='right';
      ctx.fillText((max*f/1000).toFixed(0)+'k', pad.left-4, y+4);
    });
    data.forEach((val,i) => {
      const x = pad.left+i*gap+(gap-barW)/2;
      const bH = Math.max(2,(val/max)*chartH);
      const y = pad.top+chartH-bH;
      const grad = ctx.createLinearGradient(0,y,0,y+bH);
      grad.addColorStop(0,'#F5A623'); grad.addColorStop(1,'#C8820A');
      ctx.fillStyle=grad;
      ctx.beginPath(); ctx.roundRect(x,y,barW,bH,[4,4,0,0]); ctx.fill();
      ctx.fillStyle='#7A6654'; ctx.font='10px DM Sans'; ctx.textAlign='center';
      ctx.fillText(labels[i]||'', x+barW/2, h-8);
    });
  },

  drawCatChart() {
    const canvas = document.getElementById('reportCatChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.offsetWidth||400;
    const h = 260;
    canvas.width=w; canvas.height=h;
    const cats = { honey:0, peanut_butter:0, peanuts:0 };
    DB.getOrders().forEach(o => o.items.forEach(item => {
      const p = DB.getProduct(item.productId);
      if (p) cats[p.category] = (cats[p.category]||0) + item.qty*item.unitPrice;
    }));
    const labels = Object.keys(cats).map(k=>k.replace('_',' '));
    const vals = Object.values(cats);
    const total = vals.reduce((s,v)=>s+v,0)||1;
    const colors = ['#C8820A','#6B4226','#2E7D53'];
    const cx=w/2, cy=h/2-10, r=Math.min(cx,cy)-20;
    let angle=-Math.PI/2;
    vals.forEach((v,i) => {
      const slice=(v/total)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,r,angle,angle+slice);
      ctx.fillStyle=colors[i]; ctx.fill();
      ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.stroke();
      angle+=slice;
    });
    ctx.beginPath(); ctx.arc(cx,cy,r*0.5,0,Math.PI*2);
    ctx.fillStyle='#fff'; ctx.fill();
    ctx.fillStyle='#3D2B1F'; ctx.font='bold 12px DM Sans'; ctx.textAlign='center';
    ctx.fillText('Revenue', cx, cy-4);
    ctx.fillText('by Category', cx, cy+14);
    const ly=h-60;
    labels.forEach((label,i) => {
      const x=20+i*(w/3);
      ctx.fillStyle=colors[i]; ctx.fillRect(x,ly,12,12);
      ctx.fillStyle='#3D2B1F'; ctx.font='11px DM Sans'; ctx.textAlign='left';
      ctx.fillText(label, x+16, ly+10);
      ctx.fillStyle='#7A6654'; ctx.font='10px DM Mono';
      ctx.fillText(DB.fmtMoney(vals[i]), x+16, ly+24);
    });
  },

  printOutstandingReport() {
    const outstanding = DB.getOutstandingCustomers();
    const grandTotal = outstanding.reduce((s,ob)=>s+ob.balance,0);
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Outstanding Debtors Report</title>
    <style>
      ${Pages.letterheadCSS('#C0392B')}
      .total-row td { font-weight:800; color:#C0392B; font-size:14px; }
    </style>
    </head><body>
    <div class="page-frame">

      ${Pages.letterheadHTML()}

      <div class="doc-banner">
        <div class="doc-type-title">OUTSTANDING DEBTORS REPORT</div>
        <div class="doc-meta-right">
          Printed: ${DB.fmtDate(new Date().toISOString())}<br>
          <strong>${outstanding.length} customer(s) with balance</strong>
        </div>
      </div>

      <div class="summary" style="margin-bottom:20px">
        <div>
          <div class="meta-label">Customers with Balance</div>
          <div style="font-size:24px;font-weight:800;color:#C0392B">${outstanding.length}</div>
        </div>
        <div>
          <div class="meta-label">Total Orders Pending</div>
          <div style="font-size:24px;font-weight:800;color:#1A1209">${outstanding.reduce((s,ob)=>s+ob.orders.length,0)}</div>
        </div>
        <div>
          <div class="meta-label">Total Outstanding</div>
          <div style="font-size:24px;font-weight:800;color:#C0392B">${DB.fmtMoney(grandTotal)}</div>
        </div>
      </div>

      <table>
        <thead><tr>
          <th style="width:32px">#</th>
          <th>Customer Name</th>
          <th>Phone</th>
          <th>Address</th>
          <th style="text-align:center">Open Orders</th>
          <th style="text-align:right">Balance Due</th>
        </tr></thead>
        <tbody>
          ${outstanding.sort((a,b)=>b.balance-a.balance).map((ob,i) => {
            const c = DB.getCustomer(ob.customerId);
            return `<tr>
              <td>${i+1}</td>
              <td><strong>${c?c.name:'Unknown'}</strong></td>
              <td>${c?c.phone:'—'}</td>
              <td>${c?c.address||'—':'—'}</td>
              <td style="text-align:center">${ob.orders.length}</td>
              <td style="text-align:right;font-weight:700;color:#C0392B">${DB.fmtMoney(ob.balance)}</td>
            </tr>`;
          }).join('')}
          <tr class="total-row" style="border-top:2.5px solid #C0392B">
            <td colspan="5" style="text-align:right;padding-right:12px">TOTAL OUTSTANDING:</td>
            <td style="text-align:right">${DB.fmtMoney(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="lh-footer">
        Nurtured Choice Products — Outstanding Debtors Report &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-KE')}<br>
        P.O Box 28675 - 00200 Nairobi, Kenya &nbsp;|&nbsp; Tel: +254 726 441 206 &nbsp;|&nbsp; nurturedchoice@yahoo.com
      </div>

    </div>
    </body></html>`;
    Pages.printDoc(html);
  },
};

// ============================================================
// Boot
// ============================================================
document.addEventListener('DOMContentLoaded', () => App.init());
