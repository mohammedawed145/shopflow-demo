'use strict';

/* ============================================================
   ShopFlow — المبيعات: القائمة، إنشاء الفاتورة، تفاصيل الفاتورة
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;
  if (page === 'sales') await initSalesPage();
  else if (page === 'create-sale') await initCreateSalePage();
  else if (page === 'sale-details') await initSaleDetailsPage();
});

/* ============================================================
   صفحة قائمة الفواتير
   ============================================================ */

const salesState = { search: '', from: '', to: '', status: '', page: 1 };

async function initSalesPage() {
  const user = await Components.initAppPage({
    active: 'sales',
    pageTitle: 'المبيعات والفواتير',
    breadcrumb: [{ title: 'لوحة التحكم', href: 'dashboard.html' }, { title: 'المبيعات والفواتير' }]
  });
  if (!user) return;

  document.getElementById('sales-search').addEventListener('input', Helpers.debounce((e) => {
    salesState.search = e.target.value.trim();
    salesState.page = 1;
    loadSales();
  }, 350));

  ['sales-from', 'sales-to'].forEach((id) => {
    document.getElementById(id).addEventListener('change', (e) => {
      salesState[id === 'sales-from' ? 'from' : 'to'] = e.target.value;
      salesState.page = 1;
      loadSales();
    });
  });

  document.getElementById('sales-status').addEventListener('change', (e) => {
    salesState.status = e.target.value;
    salesState.page = 1;
    loadSales();
  });

  document.getElementById('sales-body').addEventListener('click', onSaleAction);

  loadSales();
}

async function loadSales() {
  const body = document.getElementById('sales-body');
  body.innerHTML = Components.tableSkeleton(9, 7);

  try {
    const res = await Api.get('/sales', {
      search: salesState.search,
      from: salesState.from,
      to: salesState.to,
      status: salesState.status,
      page: salesState.page,
      per_page: 10
    });
    renderSales(res.data || []);
    Components.pagination(document.getElementById('sales-pagination'), res.meta, (p) => {
      salesState.page = p;
      loadSales();
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="9">${Components.errorState(err.message)}</td></tr>`;
  }
}

function renderSales(sales) {
  const body = document.getElementById('sales-body');

  if (!sales.length) {
    body.innerHTML = `<tr><td colspan="9">${Components.emptyState({
      icon: 'bi-receipt',
      title: 'لا توجد فواتير',
      message: 'لم يتم العثور على فواتير مطابقة للبحث أو الفلاتر المحددة',
      actionHtml: '<a class="btn btn-primary" href="create-sale.html"><i class="bi bi-plus-lg me-1"></i>فاتورة جديدة</a>'
    })}</td></tr>`;
    return;
  }

  body.innerHTML = sales.map((s) => `
    <tr ${s.status === 'cancelled' ? 'style="opacity:.55"' : ''}>
      <td><a class="fw-bold text-reset" href="sale-details.html?id=${s.id}">${Helpers.escapeHtml(s.invoice_no)}</a></td>
      <td class="d-none d-md-table-cell">${Helpers.escapeHtml(s.customer_name || 'عميل نقدي')}</td>
      <td class="d-none d-lg-table-cell text-muted small">${Helpers.formatDate(s.date)}</td>
      <td class="fw-bold">${Helpers.formatCurrency(s.total)}</td>
      <td class="d-none d-sm-table-cell">${Helpers.formatCurrency(s.paid)}</td>
      <td class="${s.remaining > 0 ? 'money-out' : 'text-muted'}">${Helpers.formatCurrency(s.remaining)}</td>
      <td class="d-none d-lg-table-cell">${Helpers.paymentMethod(s.payment_method)}</td>
      <td class="d-none d-md-table-cell">${Components.saleStatusBadge(s.status)}</td>
      <td class="cell-actions">
        <a class="btn-icon text-primary" href="sale-details.html?id=${s.id}" title="التفاصيل"><i class="bi bi-eye"></i></a>
        <a class="btn-icon text-secondary" href="sale-details.html?id=${s.id}&print=1" title="طباعة"><i class="bi bi-printer"></i></a>
        ${s.status !== 'cancelled' ? `
        <button class="btn-icon text-danger" type="button" data-action="cancel" data-id="${s.id}"
                data-no="${Helpers.escapeHtml(s.invoice_no)}" data-roles="owner,admin" title="إلغاء الفاتورة">
          <i class="bi bi-x-circle"></i>
        </button>` : ''}
      </td>
    </tr>`).join('');
}

async function onSaleAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  if (btn.dataset.action === 'cancel') {
    const confirmed = await Components.confirm({
      title: 'إلغاء الفاتورة',
      message: `هل أنت متأكد من إلغاء الفاتورة ${btn.dataset.no}؟ سيتم إرجاع الكميات إلى المخزون.`,
      confirmText: 'نعم، إلغاء الفاتورة'
    });
    if (!confirmed) return;

    try {
      await Api.put(`/sales/${btn.dataset.id}/cancel`);
      Components.toast('تم إلغاء الفاتورة وإرجاع الكميات للمخزون', 'success');
      loadSales();
    } catch (err) {
      Components.toast(err.message || 'تعذر إلغاء الفاتورة', 'error');
    }
  }
}

/* ============================================================
   صفحة إنشاء فاتورة جديدة
   ============================================================ */

const saleDraft = { items: [], products: [], customers: [] };

async function initCreateSalePage() {
  const user = await Components.initAppPage({
    active: 'sales',
    pageTitle: 'إنشاء فاتورة',
    breadcrumb: [
      { title: 'لوحة التحكم', href: 'dashboard.html' },
      { title: 'المبيعات والفواتير', href: 'sales.html' },
      { title: 'إنشاء فاتورة' }
    ]
  });
  if (!user) return;

  /* الضريبة الافتراضية من إعدادات المتجر */
  const settings = Helpers.getSettings();
  if (settings.tax_rate !== undefined) {
    document.getElementById('sale-tax').value = settings.tax_rate;
  }

  /* تحميل المنتجات والعملاء */
  await Promise.all([loadSaleProducts(), loadSaleCustomers()]);

  /* البحث عن منتج */
  const searchInput = document.getElementById('sale-product-search');
  searchInput.addEventListener('input', Helpers.debounce(() => {
    renderProductSearchResults(searchInput.value.trim());
  }, 200));
  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) renderProductSearchResults(searchInput.value.trim());
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#sale-search-results') && !e.target.closest('#sale-product-search')) {
      hideProductSearch();
    }
  });

  /* تحديث الملخص عند تغيير الخصم/الضريبة/المدفوع */
  ['sale-discount', 'sale-tax', 'sale-paid'].forEach((id) => {
    document.getElementById(id).addEventListener('input', updateSaleSummary);
  });
  document.getElementById('paid-full-btn').addEventListener('click', () => {
    const total = computeSaleTotals().total;
    document.getElementById('sale-paid').value = total;
    updateSaleSummary();
  });

  document.getElementById('sale-items-body').addEventListener('click', onSaleItemAction);
  document.getElementById('sale-items-body').addEventListener('input', onSaleItemInput);
  document.getElementById('sale-items-body').addEventListener('change', onSaleItemInput);

  document.getElementById('sale-save-btn').addEventListener('click', saveSale);
  document.getElementById('sale-clear-btn').addEventListener('click', clearSaleDraft);

  renderSaleItems();
  updateSaleSummary();
}

async function loadSaleProducts() {
  try {
    const res = await Api.get('/products', { per_page: 100 });
    saleDraft.products = res.data || [];
  } catch (err) {
    Components.toast(err.message || 'تعذر تحميل المنتجات', 'error');
  }
}

async function loadSaleCustomers() {
  try {
    const res = await Api.get('/customers', { per_page: 100 });
    saleDraft.customers = res.data || [];
    const select = document.getElementById('sale-customer');
    saleDraft.customers.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  } catch { /* العملاء غير متاحين — بيع نقدي */ }
}

/* ---------- البحث عن منتج وإضافته ---------- */

function renderProductSearchResults(query) {
  const box = document.getElementById('sale-search-results');
  if (!query) { hideProductSearch(); return; }

  const q = query.toLowerCase();
  const matches = saleDraft.products
    .filter((p) => p.name.toLowerCase().includes(q) || String(p.sku || '').toLowerCase().includes(q))
    .slice(0, 8);

  if (!matches.length) {
    box.innerHTML = '<div class="text-muted text-center py-3 small">لا توجد نتائج مطابقة</div>';
    box.classList.remove('d-none');
    return;
  }

  box.innerHTML = matches.map((p) => {
    const stock = Helpers.stockStatus(p);
    return `<button type="button" class="dropdown-item d-flex align-items-center gap-2 rounded-2 mb-1" data-product-id="${p.id}">
      ${Components.productThumb(p)}
      <span class="flex-grow-1 text-start">
        <span class="d-block fw-bold small">${Helpers.escapeHtml(p.name)}</span>
        <span class="d-block text-muted" style="font-size:.72rem">${Helpers.escapeHtml(p.sku || '')}</span>
      </span>
      <span class="text-end">
        <span class="d-block fw-bold text-primary">${Helpers.formatCurrency(p.price)}</span>
        <span class="badge ${stock.class}" style="font-size:.62rem">${Helpers.formatNumber(p.quantity)}</span>
      </span>
    </button>`;
  }).join('');
  box.classList.remove('d-none');
}

function hideProductSearch() {
  document.getElementById('sale-search-results').classList.add('d-none');
}

document.addEventListener('click', (e) => {
  const item = e.target.closest('#sale-search-results [data-product-id]');
  if (item) {
    addProductToSale(Number(item.dataset.productId));
    document.getElementById('sale-product-search').value = '';
    hideProductSearch();
  }
});

function addProductToSale(productId) {
  const product = saleDraft.products.find((p) => p.id === productId);
  if (!product) return;

  if (Number(product.quantity) <= 0) {
    Components.toast('هذا المنتج غير متوفر في المخزون حاليًا', 'error');
    return;
  }

  /* منع التكرار: زيادة الكمية بدلًا من إضافة سطر جديد */
  const existing = saleDraft.items.find((it) => it.product_id === productId);
  if (existing) {
    if (existing.quantity + 1 > Number(product.quantity)) {
      Components.toast(`الكمية المطلوبة من «${product.name}» تتجاوز المخزون المتاح (${Helpers.formatNumber(product.quantity)})`, 'warning');
      return;
    }
    existing.quantity += 1;
  } else {
    saleDraft.items.push({
      product_id: product.id,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      quantity: 1,
      stock: Number(product.quantity)
    });
  }

  renderSaleItems();
  updateSaleSummary();
}

function renderSaleItems() {
  const body = document.getElementById('sale-items-body');
  document.getElementById('sale-items-count').textContent = Helpers.formatNumber(saleDraft.items.length);

  if (!saleDraft.items.length) {
    body.innerHTML = `<tr><td colspan="5">${Components.emptyState({
      icon: 'bi-cart-plus',
      title: 'لم تُضف منتجات بعد',
      message: 'ابحث عن منتج في الأعلى واختره لإضافته إلى الفاتورة'
    })}</td></tr>`;
    return;
  }

  body.innerHTML = saleDraft.items.map((it, index) => `
    <tr>
      <td>
        <span class="cell-main d-block">${Helpers.escapeHtml(it.name)}</span>
        <span class="cell-sub input-ltr d-block">${Helpers.escapeHtml(it.sku || '')} · متاح: ${Helpers.formatNumber(it.stock)}</span>
      </td>
      <td>
        <input type="number" class="form-control form-control-sm" style="max-width:110px" value="${it.price}"
               min="0" step="0.01" data-field="price" data-index="${index}" title="سعر البيع لهذا الصنف">
      </td>
      <td>
        <div class="qty-group">
          <button type="button" class="qty-btn" data-action="decrease" data-index="${index}">−</button>
          <input type="number" value="${it.quantity}" min="1" max="${it.stock}" step="1"
                 data-field="quantity" data-index="${index}" aria-label="الكمية">
          <button type="button" class="qty-btn" data-action="increase" data-index="${index}">+</button>
        </div>
      </td>
      <td class="fw-bold" data-row-total="${index}">${Helpers.formatCurrency(it.price * it.quantity)}</td>
      <td>
        <button class="btn-icon text-danger" type="button" data-action="remove" data-index="${index}" title="إزالة الصنف">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join('');
}

/** أزرار (＋/−/حذف) داخل جدول العناصر */
function onSaleItemAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const index = Number(btn.dataset.index);
  const item = saleDraft.items[index];
  if (!item) return;

  if (btn.dataset.action === 'remove') {
    saleDraft.items.splice(index, 1);
  } else if (btn.dataset.action === 'increase') {
    if (item.quantity + 1 > item.stock) {
      Components.toast(`المتاح من «${item.name}» هو ${Helpers.formatNumber(item.stock)} فقط`, 'warning');
      return;
    }
    item.quantity += 1;
  } else if (btn.dataset.action === 'decrease') {
    if (item.quantity - 1 < 1) return;
    item.quantity -= 1;
  }

  renderSaleItems();
  updateSaleSummary();
}

/** تعديل الكمية أو السعر مباشرة من الجدول */
function onSaleItemInput(e) {
  const field = e.target.closest('[data-field]');
  if (!field) return;
  const index = Number(field.dataset.index);
  const item = saleDraft.items[index];
  if (!item) return;

  let value = Number(field.value);
  if (isNaN(value)) return;

  if (field.dataset.field === 'quantity') {
    value = Math.floor(value);
    if (value < 1) { field.value = item.quantity; return; }
    if (value > item.stock) {
      field.value = item.quantity;
      Components.toast(`المتاح من «${item.name}» هو ${Helpers.formatNumber(item.stock)} فقط`, 'warning');
      return;
    }
    item.quantity = value;
  } else {
    if (value < 0) { field.value = item.price; return; }
    item.price = value;
  }

  const totalCell = document.querySelector(`[data-row-total="${index}"]`);
  if (totalCell) totalCell.textContent = Helpers.formatCurrency(item.price * item.quantity);
  updateSaleSummary();
}

/* ---------- حساب الإجماليات ---------- */

function computeSaleTotals() {
  const subtotal = saleDraft.items.reduce((s, it) => s + it.price * it.quantity, 0);
  const discountInput = Number(document.getElementById('sale-discount').value) || 0;
  const discount = Math.min(Math.max(discountInput, 0), subtotal);
  const taxRate = Math.max(Number(document.getElementById('sale-tax').value) || 0, 0);
  const taxAmount = ((subtotal - discount) * taxRate) / 100;
  const total = subtotal - discount + taxAmount;
  const paidInput = Number(document.getElementById('sale-paid').value) || 0;
  const paid = Math.min(Math.max(paidInput, 0), total);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    taxRate,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    paid: Math.round(paid * 100) / 100,
    remaining: Math.round((total - paid) * 100) / 100
  };
}

function updateSaleSummary() {
  const t = computeSaleTotals();
  document.getElementById('sum-subtotal').textContent = Helpers.formatCurrency(t.subtotal);
  document.getElementById('sum-discount').textContent = t.discount ? `- ${Helpers.formatCurrency(t.discount)}` : Helpers.formatCurrency(0);
  document.getElementById('sum-tax').textContent = Helpers.formatCurrency(t.taxAmount);
  document.getElementById('sum-total').textContent = Helpers.formatCurrency(t.total);
  document.getElementById('sum-remaining').textContent = Helpers.formatCurrency(t.remaining);
}

function clearSaleDraft() {
  saleDraft.items = [];
  document.getElementById('sale-discount').value = 0;
  document.getElementById('sale-paid').value = 0;
  document.getElementById('sale-notes').value = '';
  renderSaleItems();
  updateSaleSummary();
}

/* ---------- حفظ الفاتورة ---------- */

async function saveSale() {
  if (!saleDraft.items.length) {
    Components.toast('أضف منتجًا واحدًا على الأقل إلى الفاتورة', 'error');
    return;
  }

  const t = computeSaleTotals();
  const saveBtn = document.getElementById('sale-save-btn');
  setBtnLoading(saveBtn, true, 'جارٍ حفظ الفاتورة...');

  try {
    const res = await Api.post('/sales', {
      customer_id: document.getElementById('sale-customer').value || null,
      items: saleDraft.items.map((it) => ({ product_id: it.product_id, quantity: it.quantity, price: it.price })),
      discount: t.discount,
      tax_rate: t.taxRate,
      paid: t.paid,
      payment_method: document.getElementById('sale-payment-method').value,
      notes: document.getElementById('sale-notes').value.trim()
    });

    const sale = res.data || {};
    Components.toast('تم حفظ الفاتورة بنجاح', 'success');
    document.getElementById('success-invoice-no').textContent = sale.invoice_no || '—';
    document.getElementById('success-details-btn').href = `sale-details.html?id=${sale.id}`;

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('sale-success-modal'));
    document.getElementById('success-print-btn').onclick = () => {
      location.href = `sale-details.html?id=${sale.id}&print=1`;
    };
    document.getElementById('success-new-btn').onclick = () => {
      modal.hide();
      clearSaleDraft();
      loadSaleProducts(); // تحديث المخزون بعد الخصم
    };
    modal.show();
  } catch (err) {
    Components.toast(err.message || 'تعذر حفظ الفاتورة', 'error');
  } finally {
    setBtnLoading(saveBtn, false);
  }
}

/* ============================================================
   صفحة تفاصيل الفاتورة
   ============================================================ */

let currentSaleId = null;

async function initSaleDetailsPage() {
  currentSaleId = Helpers.getUrlParam('id');
  if (!currentSaleId) {
    location.replace('sales.html');
    return;
  }

  await Components.initAppPage({
    active: 'sales',
    pageTitle: 'تفاصيل الفاتورة',
    breadcrumb: [
      { title: 'لوحة التحكم', href: 'dashboard.html' },
      { title: 'المبيعات والفواتير', href: 'sales.html' },
      { title: 'تفاصيل الفاتورة' }
    ]
  });

  document.getElementById('btn-print-sale').addEventListener('click', () => {
    Components.printSection('#printable-invoice');
  });

  document.getElementById('btn-add-payment').addEventListener('click', () => {
    const remaining = Number(document.getElementById('invoice-box')?.dataset.remaining || 0);
    if (remaining <= 0) {
      Components.toast('الفاتورة مسددة بالكامل', 'info');
      return;
    }
    document.getElementById('sdp-remaining').textContent = Helpers.formatCurrency(remaining);
    document.getElementById('sdp-amount').value = remaining;
    Helpers.setFieldError(document.getElementById('sdp-amount'), null);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('sale-payment-modal')).show();
  });

  document.getElementById('btn-cancel-sale').addEventListener('click', async () => {
    const confirmed = await Components.confirm({
      title: 'إلغاء الفاتورة',
      message: 'سيتم إلغاء الفاتورة نهائيًا وإرجاع الكميات إلى المخزون. هل تريد المتابعة؟',
      confirmText: 'نعم، إلغاء الفاتورة'
    });
    if (!confirmed) return;
    try {
      await Api.put(`/sales/${currentSaleId}/cancel`);
      Components.toast('تم إلغاء الفاتورة بنجاح', 'success');
      loadSaleDetails();
    } catch (err) {
      Components.toast(err.message || 'تعذر إلغاء الفاتورة', 'error');
    }
  });

  document.getElementById('sale-payment-form').addEventListener('submit', submitSalePayment);

  await loadSaleDetails();

  /* طباعة تلقائية عند القدوم من زر الطباعة */
  if (Helpers.getUrlParam('print')) {
    setTimeout(() => Components.printSection('#printable-invoice'), 500);
  }
}

async function loadSaleDetails() {
  const box = document.getElementById('invoice-box');
  box.innerHTML = `<div class="card"><div class="card-body">${Components.tableSkeleton(5, 4)}</div></div>`;

  try {
    const res = await Api.get(`/sales/${currentSaleId}`);
    renderInvoice(res.data || {});
  } catch (err) {
    box.innerHTML = `<div class="card">${Components.errorState(err.message)}</div>`;
  }
}

/** بناء واجهة الفاتورة القابلة للطباعة */
function renderInvoice(sale) {
  const esc = Helpers.escapeHtml;
  const currency = (v) => Helpers.formatCurrency(v);
  const settings = Helpers.getSettings();
  const user = Auth.getUser() || {};
  const storeName = (user.store && user.store.name) || settings.store_name || 'متجر ShopFlow';
  const storeLogo = settings.logo || (user.store && user.store.logo) || 'assets/images/logo.svg';

  document.getElementById('sale-title').textContent = `فاتورة ${sale.invoice_no || ''}`;
  document.getElementById('invoice-box').dataset.remaining = sale.remaining || 0;

  document.getElementById('invoice-box').innerHTML = `
    <div class="invoice" id="printable-invoice">
      <div class="invoice-head">
        <div class="invoice-store">
          <img src="${esc(storeLogo)}" alt="شعار المتجر" onerror="this.src='assets/images/logo.svg'">
          <div>
            <h5 class="inv-store-name">${esc(storeName)}</h5>
            <p class="inv-store-info mb-0">${esc(settings.store_phone || '')}</p>
            <p class="inv-store-info mb-0">${esc(settings.store_address || '')}</p>
          </div>
        </div>
        <div class="invoice-meta">
          <div class="inv-no">${esc(sale.invoice_no || '—')}</div>
          <div class="text-muted">التاريخ: ${Helpers.formatDateTime(sale.date)}</div>
          <div class="text-muted">طريقة الدفع: ${Helpers.paymentMethod(sale.payment_method)}</div>
        </div>
      </div>

      <div class="invoice-title">
        <span><i class="bi bi-receipt me-1"></i>فاتورة مبيعات</span>
        ${Components.saleStatusBadge(sale.status)}
      </div>

      <div class="row g-2 mb-3">
        <div class="col-md-6">
          <div class="border rounded-3 p-2">
            <span class="text-muted small">العميل</span>
            <div class="fw-bold">${esc(sale.customer_name || 'عميل نقدي')}</div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="border rounded-3 p-2">
            <span class="text-muted small">عدد الأصناف</span>
            <div class="fw-bold">${Helpers.formatNumber((sale.items || []).length)}</div>
          </div>
        </div>
      </div>

      <div class="table-responsive">
        <table class="table invoice-table">
          <thead>
            <tr>
              <th>#</th>
              <th>المنتج</th>
              <th>السعر</th>
              <th>الكمية</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${(sale.items || []).map((it, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>
                  <span class="fw-bold">${esc(it.name)}</span>
                  ${it.sku ? `<span class="cell-sub input-ltr d-block">${esc(it.sku)}</span>` : ''}
                </td>
                <td>${currency(it.price)}</td>
                <td>${Helpers.formatNumber(it.quantity)}</td>
                <td class="fw-bold">${currency(it.total ?? it.price * it.quantity)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="invoice-totals">
        <div class="tot-row"><span class="text-muted">المجموع الفرعي</span><span>${currency(sale.subtotal)}</span></div>
        ${sale.discount ? `<div class="tot-row"><span class="text-muted">الخصم</span><span class="text-danger">- ${currency(sale.discount)}</span></div>` : ''}
        <div class="tot-row"><span class="text-muted">الضريبة (${Helpers.formatNumber(sale.tax_rate || 0)}%)</span><span>${currency(sale.tax_amount)}</span></div>
        <div class="tot-row grand"><span>الإجمالي</span><span>${currency(sale.total)}</span></div>
        <div class="tot-row"><span class="text-muted">المدفوع</span><span class="money-in">${currency(sale.paid)}</span></div>
        <div class="tot-row ${sale.remaining > 0 ? '' : 'd-none'}"><span class="text-muted">المتبقي</span><span class="money-out">${currency(sale.remaining)}</span></div>
      </div>

      ${sale.notes ? `<div class="alert alert-light border mt-3 small"><i class="bi bi-sticky me-1"></i><strong>ملاحظات:</strong> ${esc(sale.notes)}</div>` : ''}

      <div class="invoice-sign no-print d-none d-md-flex">
        <div class="sign-box">توقيع البائع</div>
        <div class="sign-box">توقيع المستلم</div>
      </div>
      <div class="text-center text-muted small mt-3">شكرًا لتعاملكم معنا · ${esc(storeName)}</div>
    </div>`;
}

async function submitSalePayment(e) {
  e.preventDefault();
  const { valid, data } = Helpers.validateForm(e.target);
  if (!valid) return;

  const saveBtn = document.getElementById('sdp-save-btn');
  setBtnLoading(saveBtn, true, 'جارٍ التسجيل...');

  try {
    await Api.post(`/sales/${currentSaleId}/payments`, {
      amount: Number(data.amount),
      method: data.method,
      notes: document.getElementById('sdp-notes').value.trim()
    });
    Components.toast('تم تسجيل الدفعة بنجاح', 'success');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('sale-payment-modal')).hide();
    loadSaleDetails();
  } catch (err) {
    Components.toast(err.message || 'تعذر تسجيل الدفعة', 'error');
  } finally {
    setBtnLoading(saveBtn, false);
  }
}
