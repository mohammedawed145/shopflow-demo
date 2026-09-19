'use strict';

/* ============================================================
   ShopFlow — لوحة التحكم (الإحصائيات + الرسم البياني + الجداول)
   ============================================================ */

let salesChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'dashboard') return;

  const user = await Components.initAppPage({
    active: 'dashboard',
    pageTitle: 'لوحة التحكم',
    breadcrumb: [{ title: 'لوحة التحكم' }]
  });
  if (!user) return;

  document.getElementById('dashboard-refresh').addEventListener('click', () => {
    loadDashboard();
  });

  loadDashboard();
});

/** جلب بيانات لوحة التحكم من الـ API وعرضها */
async function loadDashboard() {
  const statCards = document.getElementById('stat-cards');
  const invoicesBody = document.getElementById('latest-invoices-body');
  const lowStockBody = document.getElementById('low-stock-body');

  /* حالات التحميل */
  statCards.innerHTML = Components.statCardsSkeleton(7);
  invoicesBody.innerHTML = Components.tableSkeleton(8, 5);
  lowStockBody.innerHTML = Components.tableSkeleton(3, 4);

  try {
    const res = await Api.get('/dashboard');
    renderDashboard(res.data || {});
  } catch (err) {
    statCards.innerHTML = `<div class="col-12"><div class="card">
      ${Components.errorState(err.message || 'تعذر الاتصال بالخادم', true)}</div></div>`;
    invoicesBody.innerHTML = '';
    lowStockBody.innerHTML = '';
    bindRetry();
  }
}

function bindRetry() {
  const btn = document.querySelector('[data-action="retry-load"]');
  if (btn) btn.addEventListener('click', loadDashboard);
}

/** بناء محتوى لوحة التحكم من البيانات */
function renderDashboard(data) {
  document.getElementById('dashboard-updated').textContent =
    `· آخر تحديث ${new Intl.DateTimeFormat('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' }).format(new Date())}`;

  const currency = (v) => Helpers.formatCurrency(v);
  const num = (v) => Helpers.formatNumber(v);

  /* بطاقات الإحصائيات */
  document.getElementById('stat-cards').innerHTML = [
    Components.statCard({ icon: 'bi-graph-up-arrow', label: 'مبيعات اليوم', value: currency(data.today_sales), color: 'primary', sub: 'مبيعات الفواتير غير الملغاة' }),
    Components.statCard({ icon: 'bi-calendar-month', label: 'مبيعات الشهر', value: currency(data.month_sales), color: 'info' }),
    Components.statCard({ icon: 'bi-piggy-bank', label: 'صافي الأرباح', value: currency(data.net_profit), color: 'success', sub: 'هذا الشهر بعد المصروفات' }),
    Components.statCard({ icon: 'bi-box-seam', label: 'عدد المنتجات', value: num(data.products_count), color: 'secondary', href: 'products.html' }),
    Components.statCard({ icon: 'bi-exclamation-triangle', label: 'منتجات منخفضة المخزون', value: num(data.low_stock_count), color: 'warning', href: 'products.html?stock=low' }),
    Components.statCard({ icon: 'bi-people', label: 'ديون العملاء (لك)', value: currency(data.customers_debt), color: 'danger', href: 'customers.html' }),
    Components.statCard({ icon: 'bi-truck', label: 'ديون الموردين (عليك)', value: currency(data.suppliers_debt), color: 'danger', href: 'suppliers.html' })
  ].join('');

  /* الرسم البياني للمبيعات */
  renderSalesChart(data.sales_chart || []);

  /* جدول آخر الفواتير */
  const invoicesBody = document.getElementById('latest-invoices-body');
  const invoices = data.latest_invoices || [];
  invoicesBody.innerHTML = invoices.length ? invoices.map((inv) => `
    <tr>
      <td><a class="fw-bold text-reset" href="sale-details.html?id=${inv.id}">${Helpers.escapeHtml(inv.invoice_no)}</a></td>
      <td class="d-none d-md-table-cell">${Helpers.escapeHtml(inv.customer_name || 'عميل نقدي')}</td>
      <td class="money-in">${currency(inv.total)}</td>
      <td class="d-none d-lg-table-cell">${currency(inv.paid)}</td>
      <td class="d-none d-lg-table-cell ${inv.remaining > 0 ? 'money-out' : ''}">${currency(inv.remaining)}</td>
      <td class="d-none d-md-table-cell">${Components.saleStatusBadge(inv.status)}</td>
      <td class="d-none d-sm-table-cell text-muted small">${Helpers.formatDate(inv.date)}</td>
      <td><a class="btn btn-soft-primary btn-sm" href="sale-details.html?id=${inv.id}"><i class="bi bi-eye"></i></a></td>
    </tr>`).join('') : `
    <tr><td colspan="8">${Components.emptyState({ icon: 'bi-receipt', title: 'لا توجد فواتير بعد', message: 'ابدأ بإنشاء أول فاتورة بيع من زر «فاتورة جديدة»' })}</td></tr>`;

  /* جدول المنتجات منخفضة المخزون */
  const lowStockBody = document.getElementById('low-stock-body');
  const lowStock = data.low_stock_products || [];
  lowStockBody.innerHTML = lowStock.length ? lowStock.map((p) => {
    const stock = Helpers.stockStatus(p);
    return `
    <tr>
      <td>
        <span class="cell-main">${Helpers.escapeHtml(p.name)}</span>
        <span class="cell-sub">${Helpers.escapeHtml(p.sku || '')} · ${Helpers.escapeHtml(p.category_name || '')}</span>
      </td>
      <td><span class="badge ${stock.class}">${num(p.quantity)}</span></td>
      <td class="text-muted">${num(p.min_stock)}</td>
    </tr>`;
  }).join('') : `
    <tr><td colspan="3">${Components.emptyState({ icon: 'bi-check-circle', title: 'المخزون بحالة جيدة', message: 'لا توجد منتجات تحت الحد الأدنى للمخزون' })}</td></tr>`;
}

/** رسم بياني (Chart.js) لمبيعات آخر 14 يومًا */
function renderSalesChart(chartData) {
  const canvas = document.getElementById('sales-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const labels = chartData.map((d) => {
    const parts = String(d.date).split('-');
    return `${parts[1]}/${parts[2]}`;
  });
  const totals = chartData.map((d) => Number(d.total) || 0);
  const sum = totals.reduce((s, v) => s + v, 0);

  document.getElementById('chart-total-badge').textContent = `الإجمالي: ${Helpers.formatCurrency(sum)}`;

  if (salesChart) salesChart.destroy();

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, 'rgba(37, 99, 235, 0.85)');
  gradient.addColorStop(1, 'rgba(37, 99, 235, 0.35)');

  Chart.defaults.font.family = "'Cairo', sans-serif";

  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'المبيعات',
        data: totals,
        backgroundColor: gradient,
        borderRadius: 6,
        maxBarThickness: 38
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          rtl: true,
          callbacks: {
            label: (ctx) => ` المبيعات: ${Helpers.formatCurrency(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => Helpers.formatNumber(v) }
        }
      }
    }
  });
}
