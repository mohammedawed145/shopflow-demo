'use strict';

/* ============================================================
   ShopFlow — صفحة التقارير (reports.html)
   6 تقارير: المبيعات، الأرباح، المخزون، الأكثر مبيعًا، الديون، المصروفات
   ============================================================ */

const REPORT_COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#0F172A', '#7C3AED', '#0891B2', '#DB2777', '#65A30D', '#EA580C'];

const Reports = {
  state: { from: '', to: '', activeTab: 'sales', loaded: {}, data: {} },
  charts: {},

  init() {
    Components.initAppPage({
      active: 'reports',
      breadcrumb: [{ label: 'لوحة التحكم', href: 'dashboard.html' }, { label: 'التقارير' }],
      pageTitle: 'التقارير'
    });

    // نطاق افتراضي: آخر 30 يومًا
    this.state.from = Helpers.daysAgoInput(30);
    this.state.to = Helpers.toDateInput();
    document.getElementById('report-from').value = this.state.from;
    document.getElementById('report-to').value = this.state.to;

    this.bindEvents();
    this.loadReport('sales');
  },

  bindEvents() {
    document.getElementById('report-apply').addEventListener('click', () => {
      const from = document.getElementById('report-from').value;
      const to = document.getElementById('report-to').value;
      if (from && to && from > to) {
        Components.toast('تاريخ «من» يجب أن يكون قبل تاريخ «إلى»', 'error');
        return;
      }
      this.state.from = from;
      this.state.to = to;
      this.state.loaded = {};
      Object.values(this.charts).forEach((c) => { try { c.destroy(); } catch { /* تجاهل */ } });
      this.charts = {};
      this.loadReport(this.state.activeTab);
    });

    document.getElementById('report-export').addEventListener('click', () => this.exportActive());
    document.getElementById('report-print').addEventListener('click', () => {
      const pane = document.querySelector('.tab-content .tab-pane.active');
      if (pane) Components.printSection(pane);
    });

    // تحميل التقرير عند أول فتح لكل تبويب
    document.querySelectorAll('.nav-tabs button[data-tab]').forEach((btn) => {
      btn.addEventListener('shown.bs.tab', () => {
        const tab = btn.dataset.tab;
        this.state.activeTab = tab;
        if (!this.state.loaded[tab]) this.loadReport(tab);
      });
    });

    // إعادة المحاولة عند فشل تحميل تقرير
    document.querySelector('.tab-content').addEventListener('click', (e) => {
      if (e.target.closest('[data-action="retry-load"]')) this.loadReport(this.state.activeTab);
    });
  },

  /* ---------- تحميل تقرير حسب التبويب ---------- */
  async loadReport(tab) {
    const body = document.getElementById(`report-body-${tab}`);
    if (!body) return;
    this.state.loaded[tab] = true;
    body.innerHTML = this.loadingHtml();

    try {
      const res = await Api.get(`/reports/${tab}`, { from: this.state.from, to: this.state.to });
      const data = res.data || {};
      this.state.data[tab] = data;
      body.innerHTML = this.renderReport(tab, data);
      this.drawCharts(tab, data);
    } catch (err) {
      this.state.loaded[tab] = false;
      body.innerHTML = Components.errorState(
        (err && err.message) || 'تعذر جلب بيانات التقرير',
        'retry'
      );
    }
  },

  loadingHtml() {
    return `<div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="text-secondary mt-3 mb-0">جارٍ تحميل التقرير...</p>
    </div>`;
  },

  /* ---------- ترويسة تظهر عند الطباعة فقط ---------- */
  printHead(title) {
    const range = this.rangeLabel();
    return `<div class="d-none d-print-block report-print-head text-center mb-3">
      <h4 class="mb-1">${Helpers.escapeHtml(Helpers.getSettings().store_name || 'ShopFlow')}</h4>
      <div class="fw-bold">${Helpers.escapeHtml(title)}</div>
      <div class="small">الفترة: ${Helpers.escapeHtml(range)}</div>
    </div>`;
  },

  rangeLabel() {
    const f = this.state.from ? Helpers.formatDate(this.state.from) : '—';
    const t = this.state.to ? Helpers.formatDate(this.state.to) : '—';
    return `من ${f} إلى ${t}`;
  },

  statRow(cards) {
    return `<div class="row g-3 mb-4">${cards.join('')}</div>`;
  },

  /* ============================================================
     عرض التقرير المناسب لكل تبويب
     ============================================================ */
  renderReport(tab, data) {
    switch (tab) {
      case 'sales': return this.renderSales(data);
      case 'profit': return this.renderProfit(data);
      case 'inventory': return this.renderInventory(data);
      case 'top-products': return this.renderTopProducts(data);
      case 'debts': return this.renderDebts(data);
      case 'expenses': return this.renderExpenses(data);
      default: return Components.emptyState({ title: 'تقرير غير معروف' });
    }
  },

  /* ---------- تقرير المبيعات ---------- */
  renderSales(d) {
    const cards = this.statRow([
      Components.statCard({ icon: 'bi-cash-stack', label: 'إجمالي المبيعات', value: Helpers.formatCurrency(d.total), color: 'primary' }),
      Components.statCard({ icon: 'bi-receipt', label: 'عدد الفواتير', value: Helpers.formatNumber(d.count), color: 'info' }),
      Components.statCard({ icon: 'bi-calculator', label: 'متوسط الفاتورة', value: Helpers.formatCurrency(d.avg), color: 'success' })
    ]);

    const invoices = d.invoices || [];
    const rows = invoices.map((inv) => `
      <tr>
        <td><a href="sale-details.html?id=${inv.id}">${Helpers.escapeHtml(inv.invoice_no || `#${inv.id}`)}</a></td>
        <td>${Helpers.escapeHtml(inv.customer_name || 'زبون نقدي')}</td>
        <td>${Helpers.formatDate(inv.date)}</td>
        <td>${Helpers.formatCurrency(inv.total)}</td>
        <td>${Helpers.formatCurrency(inv.paid)}</td>
        <td class="${(inv.remaining || 0) > 0 ? 'text-danger fw-semibold' : ''}">${Helpers.formatCurrency(inv.remaining)}</td>
        <td>${Components.saleStatusBadge(inv.status)}</td>
      </tr>`).join('');

    return this.printHead('تقرير المبيعات') + cards + `
      <div class="card mb-4">
        <div class="card-header"><i class="bi bi-graph-up me-1"></i>المبيعات اليومية</div>
        <div class="card-body"><div class="chart-box"><canvas id="report-chart-sales"></canvas></div></div>
      </div>
      <div class="card table-card">
        <div class="card-header"><i class="bi bi-receipt me-1"></i>الفواتير (${Helpers.formatNumber(invoices.length)})</div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead><tr>
              <th>رقم الفاتورة</th><th>العميل</th><th>التاريخ</th>
              <th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="7">${Components.emptyState({ title: 'لا توجد فواتير في هذه الفترة' })}</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  },

  /* ---------- تقرير الأرباح ---------- */
  renderProfit(d) {
    const cards = this.statRow([
      Components.statCard({ icon: 'bi-graph-up-arrow', label: 'الإيرادات', value: Helpers.formatCurrency(d.revenue), color: 'primary' }),
      Components.statCard({ icon: 'bi-box-seam', label: 'تكلفة البضاعة', value: Helpers.formatCurrency(d.cost), color: 'warning' }),
      Components.statCard({ icon: 'bi-plus-circle', label: 'إجمالي الربح', value: Helpers.formatCurrency(d.gross_profit), color: 'success' }),
      Components.statCard({ icon: 'bi-cash-coin', label: 'المصروفات', value: Helpers.formatCurrency(d.expenses), color: 'danger' }),
      Components.statCard({ icon: 'bi-piggy-bank', label: 'صافي الربح', value: Helpers.formatCurrency(d.net_profit), color: (d.net_profit || 0) >= 0 ? 'success' : 'danger', colClass: 'col-6 col-lg-4 col-xl-3' })
    ]);

    const items = d.items || [];
    const rows = items.map((it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${Helpers.escapeHtml(it.name)}<div class="text-secondary small input-ltr">${Helpers.escapeHtml(it.sku || '')}</div></td>
        <td>${Helpers.formatNumber(it.qty)}</td>
        <td>${Helpers.formatCurrency(it.revenue)}</td>
        <td>${Helpers.formatCurrency(it.cost)}</td>
        <td class="${(it.profit || 0) >= 0 ? 'text-success fw-semibold' : 'text-danger fw-semibold'}">${Helpers.formatCurrency(it.profit)}</td>
        <td>${Helpers.formatNumber(it.margin)}%</td>
      </tr>`).join('');

    return this.printHead('تقرير الأرباح') + cards + `
      <div class="card table-card">
        <div class="card-header"><i class="bi bi-table me-1"></i>الأرباح حسب المنتج</div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead><tr>
              <th>#</th><th>المنتج</th><th>الكمية المبيعة</th>
              <th>الإيراد</th><th>التكلفة</th><th>الربح</th><th>الهامش</th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="7">${Components.emptyState({ title: 'لا توجد مبيعات في هذه الفترة' })}</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  },

  /* ---------- تقرير المخزون ---------- */
  renderInventory(d) {
    const cards = this.statRow([
      Components.statCard({ icon: 'bi-clipboard-data', label: 'قيمة المخزون (تكلفة)', value: Helpers.formatCurrency(d.stock_value_cost), color: 'primary' }),
      Components.statCard({ icon: 'bi-tags', label: 'قيمة المخزون (بيع)', value: Helpers.formatCurrency(d.stock_value_retail), color: 'success' }),
      Components.statCard({ icon: 'bi-boxes', label: 'عدد المنتجات', value: Helpers.formatNumber(d.products_count), color: 'info' }),
      Components.statCard({ icon: 'bi-exclamation-triangle', label: 'منخفض المخزون', value: Helpers.formatNumber(d.low_count), color: 'warning' }),
      Components.statCard({ icon: 'bi-x-octagon', label: 'منتهي المخزون', value: Helpers.formatNumber(d.out_count), color: 'danger' })
    ]);

    const items = d.items || [];
    const rows = items.map((p) => `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${Components.productThumb(p)}
            <div>
              <div class="fw-semibold">${Helpers.escapeHtml(p.name)}</div>
              <div class="text-secondary small input-ltr">${Helpers.escapeHtml(p.sku || '')}</div>
            </div>
          </div>
        </td>
        <td>${Helpers.escapeHtml(p.category_name || '—')}</td>
        <td>${Helpers.formatNumber(p.quantity)}</td>
        <td>${Helpers.formatCurrency(p.cost)}</td>
        <td>${Helpers.formatCurrency(p.price)}</td>
        <td>${Helpers.formatCurrency(p.stock_cost)}</td>
        <td>${Components.stockBadge(p)}</td>
      </tr>`).join('');

    return this.printHead('تقرير المخزون') + cards + `
      <div class="card table-card">
        <div class="card-header"><i class="bi bi-boxes me-1"></i>المنتجات (مرتبة حسب الكمية)</div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead><tr>
              <th>المنتج</th><th>التصنيف</th><th>الكمية</th>
              <th>سعر التكلفة</th><th>سعر البيع</th><th>قيمة المخزون</th><th>الحالة</th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="7">${Components.emptyState({ title: 'لا توجد منتجات' })}</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  },

  /* ---------- المنتجات الأكثر مبيعًا ---------- */
  renderTopProducts(d) {
    const items = d.items || [];
    const medals = ['🥇', '🥈', '🥉'];
    const rows = items.map((it, i) => `
      <tr>
        <td class="fw-bold">${medals[i] || i + 1}</td>
        <td>
          <div class="fw-semibold">${Helpers.escapeHtml(it.name)}</div>
          <div class="text-secondary small input-ltr">${Helpers.escapeHtml(it.sku || '')}</div>
        </td>
        <td>${Helpers.formatNumber(it.qty)}</td>
        <td>${Helpers.formatCurrency(it.revenue)}</td>
        <td>${Helpers.formatNumber(it.orders)}</td>
      </tr>`).join('');

    return this.printHead('المنتجات الأكثر مبيعًا') + `
      <div class="card mb-4">
        <div class="card-header"><i class="bi bi-bar-chart me-1"></i>أعلى المنتجات مبيعًا</div>
        <div class="card-body"><div class="chart-box"><canvas id="report-chart-top-products"></canvas></div></div>
      </div>
      <div class="card table-card">
        <div class="card-header"><i class="bi bi-star me-1"></i>الترتيب حسب الكمية المبيعة</div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead><tr>
              <th>الترتيب</th><th>المنتج</th><th>الكمية المبيعة</th><th>الإيراد</th><th>عدد الفواتير</th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="5">${Components.emptyState({ title: 'لا توجد مبيعات في هذه الفترة' })}</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  },

  /* ---------- تقرير الديون ---------- */
  renderDebts(d) {
    const customers = d.customers || [];
    const suppliers = d.suppliers || [];

    const cards = this.statRow([
      Components.statCard({ icon: 'bi-people', label: 'ديون العملاء', value: Helpers.formatCurrency(d.customers_total), sub: `${Helpers.formatNumber(customers.length)} عميل`, color: 'danger' }),
      Components.statCard({ icon: 'bi-truck', label: 'مستحقات الموردين', value: Helpers.formatCurrency(d.suppliers_total), sub: `${Helpers.formatNumber(suppliers.length)} مورد`, color: 'warning' })
    ]);

    const custRows = customers.map((c) => `
      <tr>
        <td>${Components.avatar(c.name)} <span class="ms-1">${Helpers.escapeHtml(c.name)}</span></td>
        <td class="input-ltr">${Helpers.escapeHtml(c.phone || '—')}</td>
        <td class="text-danger fw-semibold">${Helpers.formatCurrency(c.remaining)}</td>
      </tr>`).join('');

    const suppRows = suppliers.map((s) => `
      <tr>
        <td>${Components.avatar(s.name)} <span class="ms-1">${Helpers.escapeHtml(s.name)}</span></td>
        <td class="input-ltr">${Helpers.escapeHtml(s.phone || '—')}</td>
        <td class="text-warning fw-semibold">${Helpers.formatCurrency(s.remaining)}</td>
      </tr>`).join('');

    return this.printHead('تقرير الديون') + cards + `
      <div class="row g-3">
        <div class="col-lg-6">
          <div class="card table-card">
            <div class="card-header"><i class="bi bi-people me-1"></i>العملاء المدينون</div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead><tr><th>العميل</th><th>الهاتف</th><th>المتبقي عليه</th></tr></thead>
                <tbody>${custRows || `<tr><td colspan="3">${Components.emptyState({ icon: 'bi-emoji-smile', title: 'لا توجد ديون على العملاء' })}</td></tr>`}</tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card table-card">
            <div class="card-header"><i class="bi bi-truck me-1"></i>الموردون (مستحقات عليك)</div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead><tr><th>المورد</th><th>الهاتف</th><th>المستحق له</th></tr></thead>
                <tbody>${suppRows || `<tr><td colspan="3">${Components.emptyState({ icon: 'bi-emoji-smile', title: 'لا توجد مستحقات للموردين' })}</td></tr>`}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>`;
  },

  /* ---------- تقرير المصروفات ---------- */
  renderExpenses(d) {
    const byCat = d.by_category || [];
    const items = d.items || [];

    const cards = this.statRow([
      Components.statCard({ icon: 'bi-cash-coin', label: 'إجمالي المصروفات', value: Helpers.formatCurrency(d.total), color: 'danger' }),
      Components.statCard({ icon: 'bi-list-check', label: 'عدد المصروفات', value: Helpers.formatNumber(items.length), color: 'info' }),
      Components.statCard({ icon: 'bi-tags', label: 'عدد التصنيفات', value: Helpers.formatNumber(byCat.length), color: 'primary' })
    ]);

    const rows = items.map((e) => `
      <tr>
        <td>${Helpers.formatDate(e.date)}</td>
        <td><span class="badge badge-soft-secondary">${Helpers.escapeHtml(e.category)}</span></td>
        <td>${Helpers.escapeHtml(e.notes || '—')}</td>
        <td class="text-danger fw-semibold">${Helpers.formatCurrency(e.amount)}</td>
      </tr>`).join('');

    return this.printHead('تقرير المصروفات') + cards + `
      <div class="row g-3">
        ${byCat.length ? `<div class="col-lg-5">
          <div class="card h-100">
            <div class="card-header"><i class="bi bi-pie-chart me-1"></i>المصروفات حسب التصنيف</div>
            <div class="card-body"><div class="chart-box"><canvas id="report-chart-expenses"></canvas></div></div>
          </div>
        </div>` : ''}
        <div class="${byCat.length ? 'col-lg-7' : 'col-12'}">
          <div class="card table-card h-100">
            <div class="card-header"><i class="bi bi-list-ul me-1"></i>تفاصيل المصروفات</div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead><tr><th>التاريخ</th><th>التصنيف</th><th>الملاحظات</th><th>المبلغ</th></tr></thead>
                <tbody>${rows || `<tr><td colspan="4">${Components.emptyState({ title: 'لا توجد مصروفات في هذه الفترة' })}</td></tr>`}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>`;
  },

  /* ============================================================
     الرسوم البيانية (Chart.js)
     ============================================================ */
  drawCharts(tab, data) {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Cairo', sans-serif";

    if (tab === 'sales') this.chartSalesLine(data.days || []);
    if (tab === 'top-products') this.chartTopBar((data.items || []).slice(0, 7));
    if (tab === 'expenses') this.chartExpensesDoughnut(data.by_category || []);
  },

  makeChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (this.charts[canvasId]) { try { this.charts[canvasId].destroy(); } catch { /* تجاهل */ } }
    this.charts[canvasId] = new Chart(canvas.getContext('2d'), config);
  },

  tooltipMoney() {
    return {
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label || ''}: ${Helpers.formatCurrency(ctx.parsed.y !== undefined ? ctx.parsed.y : ctx.parsed)}`
      }
    };
  },

  /** خط المبيعات اليومية */
  chartSalesLine(days) {
    const labels = days.map((d) => {
      const parts = String(d.date).split('-');
      return `${parts[1]}/${parts[2]}`;
    });
    const totals = days.map((d) => d.total);

    const ctx = document.getElementById('report-chart-sales');
    if (!ctx) return;
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.35)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0.02)');

    this.makeChart('report-chart-sales', {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'المبيعات', data: totals,
          borderColor: '#2563EB', borderWidth: 2, fill: true,
          backgroundColor: gradient, tension: 0.35,
          pointRadius: 2, pointHoverRadius: 5, pointBackgroundColor: '#2563EB'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: this.tooltipMoney() },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { callback: (v) => Helpers.formatNumber(v) } }
        }
      }
    });
  },

  /** أعمدة المنتجات الأكثر مبيعًا */
  chartTopBar(items) {
    this.makeChart('report-chart-top-products', {
      type: 'bar',
      data: {
        labels: items.map((it) => it.name),
        datasets: [{
          label: 'الكمية المبيعة',
          data: items.map((it) => it.qty),
          backgroundColor: items.map((_, i) => REPORT_COLORS[i % REPORT_COLORS.length]),
          borderRadius: 6, maxBarThickness: 42
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  },

  /** دائرة المصروفات حسب التصنيف */
  chartExpensesDoughnut(byCat) {
    this.makeChart('report-chart-expenses', {
      type: 'doughnut',
      data: {
        labels: byCat.map((c) => c.category),
        datasets: [{
          data: byCat.map((c) => c.total),
          backgroundColor: byCat.map((_, i) => REPORT_COLORS[i % REPORT_COLORS.length]),
          borderWidth: 2, borderColor: '#FFFFFF'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${Helpers.formatCurrency(ctx.parsed)}`
            }
          }
        }
      }
    });
  },

  /* ============================================================
     تصدير CSV للتقرير النشط
     ============================================================ */
  exportActive() {
    const tab = this.state.activeTab;
    const data = this.state.data[tab];
    if (!data) {
      Components.toast('لا توجد بيانات لتصديرها بعد', 'warning');
      return;
    }
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    switch (tab) {
      case 'sales': {
        const inv = data.invoices || [];
        if (!inv.length) return this.noExportData();
        Helpers.exportCsv(`تقرير-المبيعات-${stamp}`, ['رقم الفاتورة', 'العميل', 'التاريخ', 'الإجمالي', 'المدفوع', 'المتبقي', 'الحالة'],
          inv.map((i) => [i.invoice_no || `#${i.id}`, i.customer_name || 'زبون نقدي', String(i.date).slice(0, 10), i.total, i.paid, i.remaining, Helpers.saleStatus(i.status).label]));
        break;
      }
      case 'profit': {
        const items = data.items || [];
        if (!items.length) return this.noExportData();
        Helpers.exportCsv(`تقرير-الأرباح-${stamp}`, ['المنتج', 'SKU', 'الكمية', 'الإيراد', 'التكلفة', 'الربح', 'الهامش %'],
          items.map((i) => [i.name, i.sku || '', i.qty, i.revenue, i.cost, i.profit, i.margin]));
        break;
      }
      case 'inventory': {
        const items = data.items || [];
        if (!items.length) return this.noExportData();
        Helpers.exportCsv(`تقرير-المخزون-${stamp}`, ['المنتج', 'SKU', 'التصنيف', 'الكمية', 'سعر التكلفة', 'سعر البيع', 'قيمة المخزون', 'الحالة'],
          items.map((p) => [p.name, p.sku || '', p.category_name || '', p.quantity, p.cost, p.price, p.stock_cost, Helpers.stockStatus(p).label]));
        break;
      }
      case 'top-products': {
        const items = data.items || [];
        if (!items.length) return this.noExportData();
        Helpers.exportCsv(`الأكثر-مبيعا-${stamp}`, ['المنتج', 'SKU', 'الكمية المبيعة', 'الإيراد', 'عدد الفواتير'],
          items.map((i) => [i.name, i.sku || '', i.qty, i.revenue, i.orders]));
        break;
      }
      case 'debts': {
        const rows = [
          ...(data.customers || []).map((c) => ['عميل', c.name, c.phone || '', c.remaining]),
          ...(data.suppliers || []).map((s) => ['مورد', s.name, s.phone || '', s.remaining])
        ];
        if (!rows.length) return this.noExportData();
        Helpers.exportCsv(`تقرير-الديون-${stamp}`, ['النوع', 'الاسم', 'الهاتف', 'المبلغ المتبقي'], rows);
        break;
      }
      case 'expenses': {
        const items = data.items || [];
        if (!items.length) return this.noExportData();
        Helpers.exportCsv(`تقرير-المصروفات-${stamp}`, ['التاريخ', 'التصنيف', 'الملاحظات', 'المبلغ'],
          items.map((e) => [String(e.date).slice(0, 10), e.category, e.notes || '', e.amount]));
        break;
      }
    }
    Components.toast('تم تصدير التقرير بصيغة CSV', 'success');
  },

  noExportData() {
    Components.toast('لا توجد بيانات لتصديرها في هذا التقرير', 'warning');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'reports') Reports.init();
});
