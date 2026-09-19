'use strict';

/* ============================================================
   ShopFlow — المشتريات: قائمة فواتير الشراء وإنشاؤها
   ============================================================ */

const purchasesState = { search: '', from: '', to: '', page: 1 };
const purchaseDraft = { items: [], products: [], suppliers: [] };

document.addEventListener('DOMContentLoaded', async () => {
  if (document.body.dataset.page !== 'purchases') return;

  const user = await Components.initAppPage({
    active: 'purchases',
    pageTitle: 'المشتريات',
    breadcrumb: [{ title: 'لوحة التحكم', href: 'dashboard.html' }, { title: 'المشتريات' }]
  });
  if (!user) return;

  document.getElementById('purchases-search').addEventListener('input', Helpers.debounce((e) => {
    purchasesState.search = e.target.value.trim();
    purchasesState.page = 1;
    loadPurchases();
  }, 350));

  ['purchases-from', 'purchases-to'].forEach((id) => {
    document.getElementById(id).addEventListener('change', (e) => {
      purchasesState[id === 'purchases-from' ? 'from' : 'to'] = e.target.value;
      purchasesState.page = 1;
      loadPurchases();
    });
  });

  document.getElementById('btn-add-purchase').addEventListener('click', openPurchaseModal);
  document.getElementById('purchases-body').addEventListener('click', onPurchaseAction);
  document.getElementById('purchase-form').addEventListener('submit', submitPurchaseForm);
  document.getElementById('purchase-add-item').addEventListener('click', () => addPurchaseItemRow());
  document.getElementById('purchase-items').addEventListener('input', onPurchaseItemInput);
  document.getElementById('purchase-items').addEventListener('change', onPurchaseItemInput);
  document.getElementById('purchase-paid').addEventListener('input', updatePurchaseTotals);

  loadPurchases();
});

async function loadPurchases() {
  const body = document.getElementById('purchases-body');
  body.innerHTML = Components.tableSkeleton(7, 5);

  try {
    const res = await Api.get('/purchases', {
      search: purchasesState.search,
      from: purchasesState.from,
      to: purchasesState.to,
      page: purchasesState.page,
      per_page: 10
    });
    renderPurchases(res.data || []);
    Components.pagination(document.getElementById('purchases-pagination'), res.meta, (p) => {
      purchasesState.page = p;
      loadPurchases();
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="7">${Components.errorState(err.message)}</td></tr>`;
  }
}

function renderPurchases(purchases) {
  const body = document.getElementById('purchases-body');

  if (!purchases.length) {
    body.innerHTML = `<tr><td colspan="7">${Components.emptyState({
      icon: 'bi-bag-plus',
      title: 'لا توجد فواتير شراء',
      message: 'سجّل فواتير الشراء من الموردين لتحديث المخزون تلقائيًا',
      actionHtml: '<button class="btn btn-primary" type="button" onclick="openPurchaseModal()"><i class="bi bi-bag-plus me-1"></i>فاتورة شراء جديدة</button>'
    })}</td></tr>`;
    return;
  }

  body.innerHTML = purchases.map((p) => `
    <tr>
      <td><span class="fw-bold">${Helpers.escapeHtml(p.invoice_no)}</span>
        <span class="cell-sub d-block d-md-none">${Helpers.escapeHtml(p.supplier_name || '')}</span></td>
      <td class="d-none d-md-table-cell">${Helpers.escapeHtml(p.supplier_name || '—')}</td>
      <td class="d-none d-lg-table-cell text-muted small">${Helpers.formatDate(p.date)}</td>
      <td class="fw-bold">${Helpers.formatCurrency(p.total)}</td>
      <td class="d-none d-sm-table-cell">${Helpers.formatCurrency(p.paid)}</td>
      <td class="${p.remaining > 0 ? 'money-out' : 'text-muted'}">${Helpers.formatCurrency(p.remaining)}</td>
      <td class="cell-actions">
        <button class="btn-icon text-danger" type="button" data-action="delete" data-id="${p.id}"
                data-no="${Helpers.escapeHtml(p.invoice_no)}" data-roles="owner,admin" title="حذف الفاتورة">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>`).join('');
}

async function onPurchaseAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  if (btn.dataset.action === 'delete') {
    const confirmed = await Components.confirm({
      title: 'حذف فاتورة الشراء',
      message: `سيتم حذف الفاتورة ${btn.dataset.no} وخصم كمياتها من المخزون. هل تريد المتابعة؟`,
      confirmText: 'نعم، حذف'
    });
    if (!confirmed) return;

    try {
      await Api.del(`/purchases/${btn.dataset.id}`);
      Components.toast('تم حذف فاتورة الشراء وتعديل المخزون', 'success');
      loadPurchases();
    } catch (err) {
      Components.toast(err.message || 'تعذر حذف فاتورة الشراء', 'error');
    }
  }
}

/* ============================================================
   نافذة إنشاء فاتورة شراء
   ============================================================ */

async function openPurchaseModal() {
  document.getElementById('purchase-date').value = Helpers.toDateInput();
  document.getElementById('purchase-paid').value = 0;
  document.getElementById('purchase-notes').value = '';
  purchaseDraft.items = [];

  /* تحميل الموردين والمنتجات */
  try {
    const [supRes, prodRes] = await Promise.all([
      Api.get('/suppliers', { per_page: 100 }),
      Api.get('/products', { per_page: 100 })
    ]);
    purchaseDraft.suppliers = supRes.data || [];
    purchaseDraft.products = prodRes.data || [];
  } catch (err) {
    Components.toast(err.message || 'تعذر تحميل البيانات', 'error');
    return;
  }

  const supplierSelect = document.getElementById('purchase-supplier');
  supplierSelect.innerHTML = '<option value="">اختر المورد...</option>' +
    purchaseDraft.suppliers.map((s) => `<option value="${s.id}">${Helpers.escapeHtml(s.name)}</option>`).join('');

  renderPurchaseItems();
  updatePurchaseTotals();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('purchase-modal')).show();
}

function addPurchaseItemRow(product) {
  purchaseDraft.items.push({
    product_id: product ? product.id : '',
    quantity: 1,
    cost: product ? Number(product.cost) : 0
  });
  renderPurchaseItems();
  updatePurchaseTotals();
}

function renderPurchaseItems() {
  const box = document.getElementById('purchase-items');

  if (!purchaseDraft.items.length) {
    box.innerHTML = `<div class="text-muted text-center small py-2">لا توجد أصناف — اضغط «إضافة صنف»</div>`;
    return;
  }

  box.innerHTML = purchaseDraft.items.map((item, index) => `
    <div class="row g-2 align-items-center mb-2">
      <div class="col-md-5">
        <select class="form-select form-select-sm" data-field="product" data-index="${index}">
          <option value="">اختر المنتج...</option>
          ${purchaseDraft.products.map((p) => `
            <option value="${p.id}" ${String(p.id) === String(item.product_id) ? 'selected' : ''}>
              ${Helpers.escapeHtml(p.name)} ${p.sku ? `(${Helpers.escapeHtml(p.sku)})` : ''}
            </option>`).join('')}
        </select>
      </div>
      <div class="col-md-2">
        <input type="number" class="form-control form-control-sm" placeholder="الكمية" min="1" step="1"
               value="${item.quantity}" data-field="quantity" data-index="${index}">
      </div>
      <div class="col-md-2">
        <input type="number" class="form-control form-control-sm" placeholder="سعر الشراء" min="0" step="0.01"
               value="${item.cost}" data-field="cost" data-index="${index}">
      </div>
      <div class="col-md-2">
        <div class="form-control bg-light form-control-sm fw-bold" data-item-total="${index}">0.00</div>
      </div>
      <div class="col-md-1">
        <button class="btn-icon text-danger" type="button" data-action="remove-item" data-index="${index}" title="حذف الصنف">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>`).join('');

  /* تحديث مجاميع الصفوف */
  purchaseDraft.items.forEach((item, i) => {
    const cell = box.querySelector(`[data-item-total="${i}"]`);
    if (cell) cell.textContent = Helpers.formatNumber(item.quantity * item.cost);
  });
}

function onPurchaseItemInput(e) {
  const target = e.target.closest('[data-field], [data-action]');
  if (!target) return;

  if (target.dataset.action === 'remove-item') {
    purchaseDraft.items.splice(Number(target.dataset.index), 1);
    renderPurchaseItems();
    updatePurchaseTotals();
    return;
  }

  const index = Number(target.dataset.index);
  const item = purchaseDraft.items[index];
  if (!item) return;

  if (target.dataset.field === 'product') {
    item.product_id = target.value;
    const product = purchaseDraft.products.find((p) => String(p.id) === String(target.value));
    item.cost = product ? Number(product.cost) : 0;
    renderPurchaseItems();
  } else if (target.dataset.field === 'quantity') {
    item.quantity = Math.max(1, Math.floor(Number(target.value) || 1));
  } else if (target.dataset.field === 'cost') {
    item.cost = Math.max(0, Number(target.value) || 0);
  }

  const totalCell = document.querySelector(`#purchase-items [data-item-total="${index}"]`);
  if (totalCell) totalCell.textContent = Helpers.formatNumber(item.quantity * item.cost);
  updatePurchaseTotals();
}

function computePurchaseTotals() {
  const total = purchaseDraft.items.reduce((s, it) => s + it.quantity * it.cost, 0);
  const paid = Math.min(Math.max(Number(document.getElementById('purchase-paid').value) || 0, 0), total);
  return { total: Math.round(total * 100) / 100, paid, remaining: Math.round((total - paid) * 100) / 100 };
}

function updatePurchaseTotals() {
  const t = computePurchaseTotals();
  document.getElementById('purchase-total-display').textContent = Helpers.formatCurrency(t.total);
  document.getElementById('purchase-remaining-display').textContent = Helpers.formatCurrency(t.remaining);
}

async function submitPurchaseForm(e) {
  e.preventDefault();

  const supplierId = document.getElementById('purchase-supplier').value;
  if (!supplierId) {
    Helpers.setFieldError(document.getElementById('purchase-supplier'), 'اختر المورد');
    return;
  }

  const items = purchaseDraft.items.filter((it) => it.product_id && it.quantity > 0);
  if (!items.length) {
    Components.toast('أضف صنفًا واحدًا على الأقل لفاتورة الشراء', 'error');
    return;
  }

  const t = computePurchaseTotals();
  const saveBtn = document.getElementById('purchase-save-btn');
  setBtnLoading(saveBtn, true, 'جارٍ الحفظ...');

  try {
    await Api.post('/purchases', {
      supplier_id: Number(supplierId),
      date: document.getElementById('purchase-date').value || Helpers.toDateInput(),
      items: items.map((it) => ({ product_id: Number(it.product_id), quantity: it.quantity, cost: it.cost })),
      paid: t.paid,
      notes: document.getElementById('purchase-notes').value.trim()
    });
    Components.toast('تم حفظ فاتورة الشراء وتحديث المخزون', 'success');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('purchase-modal')).hide();
    loadPurchases();
  } catch (err) {
    Components.toast(err.message || 'تعذر حفظ فاتورة الشراء', 'error');
  } finally {
    setBtnLoading(saveBtn, false);
  }
}

window.openPurchaseModal = openPurchaseModal;
