'use strict';

/* ============================================================
   ShopFlow — العملاء (القائمة + التفاصيل) والموردون
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;
  if (page === 'customers') await initCustomersPage();
  else if (page === 'customer-details') await initCustomerDetailsPage();
  else if (page === 'suppliers') await initSuppliersPage();
});

/* ============================================================
   صفحة قائمة العملاء
   ============================================================ */

const customersState = { search: '', page: 1 };

async function initCustomersPage() {
  const user = await Components.initAppPage({
    active: 'customers',
    pageTitle: 'العملاء',
    breadcrumb: [{ title: 'لوحة التحكم', href: 'dashboard.html' }, { title: 'العملاء' }]
  });
  if (!user) return;

  document.getElementById('customers-search').addEventListener('input', Helpers.debounce((e) => {
    customersState.search = e.target.value.trim();
    customersState.page = 1;
    loadCustomers();
  }, 350));

  document.getElementById('btn-add-customer').addEventListener('click', () => openCustomerModal(null));
  document.getElementById('customers-body').addEventListener('click', onCustomerAction);
  document.getElementById('customer-form').addEventListener('submit', submitCustomerForm);
  document.getElementById('payment-form').addEventListener('submit', submitCustomerPayment);

  loadCustomers();
}

async function loadCustomers() {
  const body = document.getElementById('customers-body');
  body.innerHTML = Components.tableSkeleton(6, 6);

  try {
    const res = await Api.get('/customers', {
      search: customersState.search,
      page: customersState.page,
      per_page: 10
    });
    renderCustomers(res.data || []);
    Components.pagination(document.getElementById('customers-pagination'), res.meta, (p) => {
      customersState.page = p;
      loadCustomers();
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6">${Components.errorState(err.message)}</td></tr>`;
  }
}

function renderCustomers(customers) {
  const body = document.getElementById('customers-body');

  if (!customers.length) {
    body.innerHTML = `<tr><td colspan="6">${Components.emptyState({
      icon: 'bi-people',
      title: 'لا يوجد عملاء',
      message: 'أضف عملاءك لمتابعة مشترياتهم وديونهم',
      actionHtml: '<button class="btn btn-primary" type="button" onclick="openCustomerModal(null)"><i class="bi bi-person-plus me-1"></i>إضافة عميل</button>'
    })}</td></tr>`;
    return;
  }

  body.innerHTML = customers.map((c) => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          ${Components.avatar(c.name)}
          <span>
            <span class="cell-main d-block">${Helpers.escapeHtml(c.name)}</span>
            <span class="cell-sub input-ltr d-block">${Helpers.escapeHtml(c.phone || '')}</span>
          </span>
        </div>
      </td>
      <td class="d-none d-md-table-cell input-ltr">${Helpers.escapeHtml(c.phone || '—')}</td>
      <td>${Helpers.formatCurrency(c.purchases_total)}</td>
      <td class="d-none d-sm-table-cell money-in">${Helpers.formatCurrency(c.paid)}</td>
      <td class="${c.remaining > 0 ? 'money-out' : 'text-muted'}">${Helpers.formatCurrency(c.remaining)}</td>
      <td class="cell-actions">
        <a class="btn-icon text-primary" href="customer-details.html?id=${c.id}" title="التفاصيل"><i class="bi bi-eye"></i></a>
        <button class="btn-icon text-success" type="button" data-action="payment" data-id="${c.id}" data-name="${Helpers.escapeHtml(c.name)}"
                data-debt="${Helpers.formatNumber(c.remaining)}" title="تسجيل دفعة" ${c.remaining <= 0 ? 'disabled style="opacity:.4"' : ''}>
          <i class="bi bi-cash-coin"></i>
        </button>
        <button class="btn-icon text-secondary" type="button" data-action="edit" data-id="${c.id}" title="تعديل"><i class="bi bi-pencil"></i></button>
        <button class="btn-icon text-danger" type="button" data-action="delete" data-id="${c.id}" data-name="${Helpers.escapeHtml(c.name)}" title="حذف"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`).join('');
}

let customersCache = [];

async function onCustomerAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);

  if (btn.dataset.action === 'payment') {
    document.getElementById('payment-customer-name').textContent = btn.dataset.name;
    document.getElementById('payment-customer-debt').textContent = `المتبقي: ${btn.dataset.debt}`;
    document.getElementById('payment-modal').dataset.customerId = id;
    document.getElementById('payment-date').value = Helpers.toDateInput();
    document.getElementById('payment-amount').value = '';
    Helpers.setFieldError(document.getElementById('payment-amount'), null);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('payment-modal')).show();
    return;
  }

  if (btn.dataset.action === 'edit') {
    try {
      const res = await Api.get('/customers', { search: '', page: 1, per_page: 100 });
      customersCache = res.data || [];
      const customer = customersCache.find((c) => String(c.id) === String(id));
      if (customer) openCustomerModal(customer);
    } catch (err) {
      Components.toast(err.message, 'error');
    }
    return;
  }

  if (btn.dataset.action === 'delete') {
    const confirmed = await Components.confirm({
      title: 'حذف العميل',
      message: `هل أنت متأكد من حذف العميل «${btn.dataset.name}»؟`,
      confirmText: 'نعم، حذف'
    });
    if (!confirmed) return;
    try {
      await Api.del(`/customers/${id}`);
      Components.toast('تم حذف العميل بنجاح', 'success');
      loadCustomers();
    } catch (err) {
      Components.toast(err.message || 'تعذر حذف العميل', 'error');
    }
  }
}

function openCustomerModal(customer) {
  document.getElementById('customer-id').value = customer ? customer.id : '';
  document.getElementById('customer-name').value = customer ? customer.name : '';
  document.getElementById('customer-phone').value = customer ? customer.phone : '';
  document.getElementById('customer-email').value = customer ? (customer.email || '') : '';
  document.getElementById('customer-address').value = customer ? (customer.address || '') : '';
  document.getElementById('customer-notes').value = customer ? (customer.notes || '') : '';
  document.getElementById('customer-modal-title').innerHTML = customer
    ? '<i class="bi bi-pencil-square me-1 text-primary"></i>تعديل العميل'
    : '<i class="bi bi-person-plus me-1 text-primary"></i>إضافة عميل';
  ['customer-name', 'customer-phone', 'customer-email'].forEach((idv) =>
    Helpers.setFieldError(document.getElementById(idv), null));
  bootstrap.Modal.getOrCreateInstance(document.getElementById('customer-modal')).show();
}

async function submitCustomerForm(e) {
  e.preventDefault();
  const { valid, data } = Helpers.validateForm(e.target);
  if (!valid) return;

  const id = document.getElementById('customer-id').value;
  const saveBtn = document.getElementById('customer-save-btn');
  setBtnLoading(saveBtn, true, 'جارٍ الحفظ...');

  try {
    const payload = {
      name: data.name,
      phone: data.phone,
      email: document.getElementById('customer-email').value.trim(),
      address: document.getElementById('customer-address').value.trim(),
      notes: document.getElementById('customer-notes').value.trim()
    };
    if (id) {
      await Api.put(`/customers/${id}`, payload);
      Components.toast('تم تحديث بيانات العميل بنجاح', 'success');
    } else {
      await Api.post('/customers', payload);
      Components.toast('تم إضافة العميل بنجاح', 'success');
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('customer-modal')).hide();
    loadCustomers();
  } catch (err) {
    Components.toast(err.message || 'تعذر حفظ بيانات العميل', 'error');
  } finally {
    setBtnLoading(saveBtn, false);
  }
}

async function submitCustomerPayment(e) {
  e.preventDefault();
  const modalEl = document.getElementById('payment-modal');
  const customerId = Number(modalEl.dataset.customerId);
  const { valid, data } = Helpers.validateForm(e.target);
  if (!valid || !customerId) return;

  const saveBtn = document.getElementById('payment-save-btn');
  setBtnLoading(saveBtn, true, 'جارٍ التسجيل...');

  try {
    await Api.post(`/customers/${customerId}/payments`, {
      amount: Number(data.amount),
      method: data.method,
      date: document.getElementById('payment-date').value || Helpers.toDateInput(),
      notes: document.getElementById('payment-notes').value.trim()
    });
    Components.toast('تم تسجيل الدفعة بنجاح', 'success');
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    loadCustomers();
  } catch (err) {
    Components.toast(err.message || 'تعذر تسجيل الدفعة', 'error');
  } finally {
    setBtnLoading(saveBtn, false);
  }
}

window.openCustomerModal = openCustomerModal;

/* ============================================================
   صفحة تفاصيل العميل
   ============================================================ */

let detailsCustomerId = null;

async function initCustomerDetailsPage() {
  detailsCustomerId = Helpers.getUrlParam('id');
  if (!detailsCustomerId) {
    location.replace('customers.html');
    return;
  }

  await Components.initAppPage({
    active: 'customers',
    pageTitle: 'تفاصيل العميل',
    breadcrumb: [
      { title: 'لوحة التحكم', href: 'dashboard.html' },
      { title: 'العملاء', href: 'customers.html' },
      { title: 'تفاصيل العميل' }
    ]
  });

  document.getElementById('cd-payment-date').value = Helpers.toDateInput();
  document.getElementById('customer-payment-form').addEventListener('submit', submitDetailsPayment);
  document.getElementById('btn-print-statement').addEventListener('click', () => {
    Components.printSection('#statement-card');
  });

  loadCustomerDetails();
}

async function loadCustomerDetails() {
  const box = document.getElementById('customer-details-box');
  box.innerHTML = `<div class="card"><div class="card-body">${Components.tableSkeleton(4, 2)}</div></div>`;
  document.getElementById('customer-invoices-body').innerHTML = Components.tableSkeleton(7, 4);
  document.getElementById('statement-body').innerHTML = Components.tableSkeleton(5, 5);

  try {
    const res = await Api.get(`/customers/${detailsCustomerId}`);
    renderCustomerDetails(res.data || {});
  } catch (err) {
    box.innerHTML = `<div class="card">${Components.errorState(err.message)}</div>`;
    document.getElementById('customer-invoices-body').innerHTML = '';
    document.getElementById('statement-body').innerHTML = '';
  }
}

function renderCustomerDetails(data) {
  const c = data.customer || {};
  const esc = Helpers.escapeHtml;
  const currency = (v) => Helpers.formatCurrency(v);

  document.getElementById('customer-title').textContent = `العميل: ${c.name || ''}`;

  document.getElementById('customer-details-box').innerHTML = `
    <div class="card mb-3">
      <div class="card-body">
        <div class="row g-3 align-items-center">
          <div class="col-lg-5">
            <div class="d-flex align-items-center gap-3">
              ${Components.avatar(c.name, 'lg')}
              <div>
                <h5 class="mb-1 fw-bold">${esc(c.name || '—')}</h5>
                <div class="text-muted small d-flex flex-column gap-1">
                  ${c.phone ? `<span><i class="bi bi-telephone me-1"></i><span class="input-ltr">${esc(c.phone)}</span></span>` : ''}
                  ${c.email ? `<span><i class="bi bi-envelope me-1"></i><span class="input-ltr">${esc(c.email)}</span></span>` : ''}
                  ${c.address ? `<span><i class="bi bi-geo-alt me-1"></i>${esc(c.address)}</span>` : ''}
                  ${c.notes ? `<span><i class="bi bi-sticky me-1"></i>${esc(c.notes)}</span>` : ''}
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-7">
            <div class="row g-2 text-center">
              <div class="col-4">
                <div class="card stat-card p-2">
                  <span class="stat-icon icon-secondary"><i class="bi bi-cart-check"></i></span>
                  <span><span class="stat-value d-block">${currency(c.purchases_total)}</span><span class="stat-label">إجمالي المشتريات</span></span>
                </div>
              </div>
              <div class="col-4">
                <div class="card stat-card p-2">
                  <span class="stat-icon icon-success"><i class="bi bi-cash-stack"></i></span>
                  <span><span class="stat-value d-block">${currency(c.paid)}</span><span class="stat-label">إجمالي المدفوع</span></span>
                </div>
              </div>
              <div class="col-4">
                <div class="card stat-card p-2">
                  <span class="stat-icon icon-danger"><i class="bi bi-wallet2"></i></span>
                  <span><span class="stat-value d-block ${c.remaining > 0 ? 'text-danger' : ''}">${currency(c.remaining)}</span><span class="stat-label">المبلغ المتبقي</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  /* فواتير العميل */
  const invoicesBody = document.getElementById('customer-invoices-body');
  const invoices = data.invoices || [];
  invoicesBody.innerHTML = invoices.length ? invoices.map((inv) => `
    <tr>
      <td><a class="fw-bold text-reset" href="sale-details.html?id=${inv.id}">${esc(inv.invoice_no)}</a></td>
      <td class="d-none d-md-table-cell text-muted small">${Helpers.formatDate(inv.date)}</td>
      <td class="fw-bold">${currency(inv.total)}</td>
      <td class="d-none d-sm-table-cell">${currency(inv.paid)}</td>
      <td class="d-none d-sm-table-cell ${inv.remaining > 0 ? 'money-out' : 'text-muted'}">${currency(inv.remaining)}</td>
      <td class="d-none d-md-table-cell">${Components.saleStatusBadge(inv.status)}</td>
      <td><a class="btn-icon text-primary" href="sale-details.html?id=${inv.id}" title="عرض الفاتورة"><i class="bi bi-eye"></i></a></td>
    </tr>`).join('') : `
    <tr><td colspan="7">${Components.emptyState({ icon: 'bi-receipt', title: 'لا توجد فواتير', message: 'لم يتم إصدار فواتير لهذا العميل بعد' })}</td></tr>`;

  /* كشف الحساب */
  const statementBody = document.getElementById('statement-body');
  const statement = data.statement || [];
  statementBody.innerHTML = statement.length ? statement.map((row) => `
    <tr>
      <td class="text-muted small">${Helpers.formatDate(row.date)}</td>
      <td>
        <i class="bi ${row.type === 'invoice' ? 'bi-receipt text-primary' : 'bi-cash-stack text-success'} me-1"></i>${esc(row.label)}
      </td>
      <td class="${row.debit ? 'money-out' : 'text-muted'}">${row.debit ? currency(row.debit) : '—'}</td>
      <td class="${row.credit ? 'money-in' : 'text-muted'}">${row.credit ? currency(row.credit) : '—'}</td>
      <td class="fw-bold">${currency(row.balance)}</td>
    </tr>`).join('') : `
    <tr><td colspan="5">${Components.emptyState({ icon: 'bi-file-earmark-text', title: 'لا توجد حركات', message: 'لا توجد فواتير أو دفعات لهذا العميل' })}</td></tr>`;
}

async function submitDetailsPayment(e) {
  e.preventDefault();
  const { valid, data } = Helpers.validateForm(e.target);
  if (!valid) return;

  const submitBtn = document.getElementById('cd-payment-submit');
  setBtnLoading(submitBtn, true, 'جارٍ التسجيل...');

  try {
    await Api.post(`/customers/${detailsCustomerId}/payments`, {
      amount: Number(data.amount),
      method: data.method,
      date: document.getElementById('cd-payment-date').value || Helpers.toDateInput(),
      notes: document.getElementById('cd-payment-notes').value.trim()
    });
    Components.toast('تم تسجيل الدفعة بنجاح', 'success');
    document.getElementById('cd-payment-amount').value = '';
    loadCustomerDetails();
  } catch (err) {
    Components.toast(err.message || 'تعذر تسجيل الدفعة', 'error');
  } finally {
    setBtnLoading(submitBtn, false);
  }
}

/* ============================================================
   صفحة الموردين
   ============================================================ */

const suppliersState = { search: '', page: 1 };

async function initSuppliersPage() {
  const user = await Components.initAppPage({
    active: 'suppliers',
    pageTitle: 'الموردون',
    breadcrumb: [{ title: 'لوحة التحكم', href: 'dashboard.html' }, { title: 'الموردون' }]
  });
  if (!user) return;

  document.getElementById('suppliers-search').addEventListener('input', Helpers.debounce((e) => {
    suppliersState.search = e.target.value.trim();
    suppliersState.page = 1;
    loadSuppliers();
  }, 350));

  document.getElementById('btn-add-supplier').addEventListener('click', () => openSupplierModal(null));
  document.getElementById('suppliers-body').addEventListener('click', onSupplierAction);
  document.getElementById('supplier-form').addEventListener('submit', submitSupplierForm);
  document.getElementById('supplier-payment-form').addEventListener('submit', submitSupplierPayment);

  loadSuppliers();
}

async function loadSuppliers() {
  const body = document.getElementById('suppliers-body');
  body.innerHTML = Components.tableSkeleton(6, 5);

  try {
    const res = await Api.get('/suppliers', {
      search: suppliersState.search,
      page: suppliersState.page,
      per_page: 10
    });
    renderSuppliers(res.data || []);
    Components.pagination(document.getElementById('suppliers-pagination'), res.meta, (p) => {
      suppliersState.page = p;
      loadSuppliers();
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6">${Components.errorState(err.message)}</td></tr>`;
  }
}

function renderSuppliers(suppliers) {
  const body = document.getElementById('suppliers-body');

  if (!suppliers.length) {
    body.innerHTML = `<tr><td colspan="6">${Components.emptyState({
      icon: 'bi-truck',
      title: 'لا يوجد موردون',
      message: 'أضف مورديك لمتابعة فواتير الشراء والديون',
      actionHtml: '<button class="btn btn-primary" type="button" onclick="openSupplierModal(null)"><i class="bi bi-plus-lg me-1"></i>إضافة مورد</button>'
    })}</td></tr>`;
    return;
  }

  body.innerHTML = suppliers.map((s) => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <span class="sf-avatar" style="background:linear-gradient(135deg,#0F172A,#475569)">
            <i class="bi bi-truck"></i></span>
          <span>
            <span class="cell-main d-block">${Helpers.escapeHtml(s.name)}</span>
            <span class="cell-sub d-block">${Helpers.escapeHtml(s.company || '')}</span>
          </span>
        </div>
      </td>
      <td class="d-none d-md-table-cell input-ltr">${Helpers.escapeHtml(s.phone || '—')}</td>
      <td>${Helpers.formatCurrency(s.purchases_total)}</td>
      <td class="d-none d-sm-table-cell money-in">${Helpers.formatCurrency(s.paid)}</td>
      <td class="${s.remaining > 0 ? 'money-out' : 'text-muted'}">${Helpers.formatCurrency(s.remaining)}</td>
      <td class="cell-actions">
        <button class="btn-icon text-success" type="button" data-action="payment" data-id="${s.id}" data-name="${Helpers.escapeHtml(s.name)}"
                data-debt="${Helpers.formatNumber(s.remaining)}" title="تسجيل دفعة" ${s.remaining <= 0 ? 'disabled style="opacity:.4"' : ''}>
          <i class="bi bi-cash-coin"></i>
        </button>
        <button class="btn-icon text-secondary" type="button" data-action="edit" data-id="${s.id}" title="تعديل"><i class="bi bi-pencil"></i></button>
        <button class="btn-icon text-danger" type="button" data-action="delete" data-id="${s.id}" data-name="${Helpers.escapeHtml(s.name)}" title="حذف"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`).join('');
}

async function onSupplierAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);

  if (btn.dataset.action === 'payment') {
    document.getElementById('sp-name').textContent = btn.dataset.name;
    document.getElementById('sp-debt').textContent = `المتبقي: ${btn.dataset.debt}`;
    document.getElementById('supplier-payment-modal').dataset.supplierId = id;
    document.getElementById('sp-amount').value = '';
    Helpers.setFieldError(document.getElementById('sp-amount'), null);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('supplier-payment-modal')).show();
    return;
  }

  if (btn.dataset.action === 'edit') {
    try {
      const res = await Api.get('/suppliers', { page: 1, per_page: 100 });
      const supplier = (res.data || []).find((s) => String(s.id) === String(id));
      if (supplier) openSupplierModal(supplier);
    } catch (err) {
      Components.toast(err.message, 'error');
    }
    return;
  }

  if (btn.dataset.action === 'delete') {
    const confirmed = await Components.confirm({
      title: 'حذف المورد',
      message: `هل أنت متأكد من حذف المورد «${btn.dataset.name}»؟`,
      confirmText: 'نعم، حذف'
    });
    if (!confirmed) return;
    try {
      await Api.del(`/suppliers/${id}`);
      Components.toast('تم حذف المورد بنجاح', 'success');
      loadSuppliers();
    } catch (err) {
      Components.toast(err.message || 'تعذر حذف المورد', 'error');
    }
  }
}

function openSupplierModal(supplier) {
  document.getElementById('supplier-id').value = supplier ? supplier.id : '';
  document.getElementById('supplier-name').value = supplier ? supplier.name : '';
  document.getElementById('supplier-phone').value = supplier ? supplier.phone : '';
  document.getElementById('supplier-company').value = supplier ? (supplier.company || '') : '';
  document.getElementById('supplier-email').value = supplier ? (supplier.email || '') : '';
  document.getElementById('supplier-address').value = supplier ? (supplier.address || '') : '';
  document.getElementById('supplier-notes').value = supplier ? (supplier.notes || '') : '';
  document.getElementById('supplier-modal-title').innerHTML = supplier
    ? '<i class="bi bi-pencil-square me-1 text-primary"></i>تعديل المورد'
    : '<i class="bi bi-truck me-1 text-primary"></i>إضافة مورد';
  ['supplier-name', 'supplier-phone', 'supplier-email'].forEach((idv) =>
    Helpers.setFieldError(document.getElementById(idv), null));
  bootstrap.Modal.getOrCreateInstance(document.getElementById('supplier-modal')).show();
}

async function submitSupplierForm(e) {
  e.preventDefault();
  const { valid, data } = Helpers.validateForm(e.target);
  if (!valid) return;

  const id = document.getElementById('supplier-id').value;
  const saveBtn = document.getElementById('supplier-save-btn');
  setBtnLoading(saveBtn, true, 'جارٍ الحفظ...');

  try {
    const payload = {
      name: data.name,
      phone: data.phone,
      company: document.getElementById('supplier-company').value.trim(),
      email: document.getElementById('supplier-email').value.trim(),
      address: document.getElementById('supplier-address').value.trim(),
      notes: document.getElementById('supplier-notes').value.trim()
    };
    if (id) {
      await Api.put(`/suppliers/${id}`, payload);
      Components.toast('تم تحديث بيانات المورد بنجاح', 'success');
    } else {
      await Api.post('/suppliers', payload);
      Components.toast('تم إضافة المورد بنجاح', 'success');
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('supplier-modal')).hide();
    loadSuppliers();
  } catch (err) {
    Components.toast(err.message || 'تعذر حفظ بيانات المورد', 'error');
  } finally {
    setBtnLoading(saveBtn, false);
  }
}

async function submitSupplierPayment(e) {
  e.preventDefault();
  const modalEl = document.getElementById('supplier-payment-modal');
  const supplierId = Number(modalEl.dataset.supplierId);
  const { valid, data } = Helpers.validateForm(e.target);
  if (!valid || !supplierId) return;

  const saveBtn = document.getElementById('sp-save-btn');
  setBtnLoading(saveBtn, true, 'جارٍ التسجيل...');

  try {
    await Api.post(`/suppliers/${supplierId}/payments`, {
      amount: Number(data.amount),
      method: data.method,
      notes: document.getElementById('sp-notes').value.trim()
    });
    Components.toast('تم تسجيل الدفعة للمورد بنجاح', 'success');
    bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    loadSuppliers();
  } catch (err) {
    Components.toast(err.message || 'تعذر تسجيل الدفعة', 'error');
  } finally {
    setBtnLoading(saveBtn, false);
  }
}

window.openSupplierModal = openSupplierModal;
