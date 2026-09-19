'use strict';

/* ============================================================
   ShopFlow — المنتجات: القائمة، النموذج، التصنيفات
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;
  if (page === 'products') await initProductsPage();
  else if (page === 'product-form') await initProductFormPage();
  else if (page === 'categories') await initCategoriesPage();
});

/* ============================================================
   صفحة قائمة المنتجات
   ============================================================ */

const productsState = { search: '', category: '', stock: '', page: 1 };

async function initProductsPage() {
  const user = await Components.initAppPage({
    active: 'products',
    pageTitle: 'المنتجات',
    breadcrumb: [{ title: 'لوحة التحكم', href: 'dashboard.html' }, { title: 'المنتجات' }]
  });
  if (!user) return;

  /* استرجاع فلتر المخزون من الرابط (زر "عرض الكل" في لوحة التحكم) */
  const stockParam = Helpers.getUrlParam('stock');
  if (stockParam) {
    productsState.stock = stockParam;
    document.getElementById('products-stock-filter').value = stockParam;
  }

  document.getElementById('products-search').addEventListener('input', Helpers.debounce((e) => {
    productsState.search = e.target.value.trim();
    productsState.page = 1;
    loadProducts();
  }, 350));

  document.getElementById('products-category-filter').addEventListener('change', (e) => {
    productsState.category = e.target.value;
    productsState.page = 1;
    loadProducts();
  });

  document.getElementById('products-stock-filter').addEventListener('change', (e) => {
    productsState.stock = e.target.value;
    productsState.page = 1;
    loadProducts();
  });

  document.getElementById('products-body').addEventListener('click', onProductAction);
  document.getElementById('stock-form').addEventListener('submit', saveStock);
  document.getElementById('stock-quantity').addEventListener('input', (e) => {
    document.getElementById('stock-new-preview').textContent =
      e.target.value === '' ? '؟' : Helpers.formatNumber(e.target.value);
  });

  loadCategoryFilterOptions();
  loadProducts();
}

/** تعبئة قائمة فلتر التصنيفات */
async function loadCategoryFilterOptions() {
  try {
    const res = await Api.get('/categories', { per_page: 100 });
    const select = document.getElementById('products-category-filter');
    (res.data || []).forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = Helpers.escapeHtml(c.name);
      select.appendChild(opt);
    });
  } catch { /* التصنيفات غير متاحة حاليًا */ }
}

async function loadProducts() {
  const body = document.getElementById('products-body');
  body.innerHTML = Components.tableSkeleton(7, 6);

  try {
    const res = await Api.get('/products', {
      search: productsState.search,
      category_id: productsState.category,
      stock_status: productsState.stock,
      page: productsState.page,
      per_page: 10
    });
    renderProducts(res.data || []);
    Components.pagination(document.getElementById('products-pagination'), res.meta, (p) => {
      productsState.page = p;
      loadProducts();
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="7">${Components.errorState(err.message)}</td></tr>`;
  }
}

function renderProducts(products) {
  const body = document.getElementById('products-body');

  if (!products.length) {
    body.innerHTML = `<tr><td colspan="7">${Components.emptyState({
      icon: 'bi-box-seam',
      title: 'لا توجد منتجات',
      message: 'لم يتم العثور على منتجات مطابقة، جرّب تغيير البحث والفلاتر أو أضف منتجًا جديدًا',
      actionHtml: '<a class="btn btn-primary" href="product-form.html"><i class="bi bi-plus-lg me-1"></i>إضافة منتج</a>'
    })}</td></tr>`;
    return;
  }

  body.innerHTML = products.map((p) => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          ${Components.productThumb(p)}
          <span class="min-w-0">
            <span class="cell-main d-block">${Helpers.escapeHtml(p.name)}</span>
            <span class="cell-sub input-ltr d-block">${Helpers.escapeHtml(p.sku || '')}</span>
          </span>
        </div>
      </td>
      <td class="d-none d-md-table-cell">${Helpers.escapeHtml(p.category_name || '—')}</td>
      <td class="d-none d-lg-table-cell text-muted">${Helpers.formatCurrency(p.cost)}</td>
      <td class="fw-bold">${Helpers.formatCurrency(p.price)}</td>
      <td>${Helpers.formatNumber(p.quantity)}</td>
      <td class="d-none d-sm-table-cell">${Components.stockBadge(p)}</td>
      <td class="cell-actions">
        <a class="btn-icon text-primary" href="product-form.html?id=${p.id}" title="تعديل المنتج"><i class="bi bi-pencil"></i></a>
        <button class="btn-icon text-success" type="button" data-action="stock" data-id="${p.id}" title="تعديل المخزون"><i class="bi bi-boxes"></i></button>
        <button class="btn-icon text-danger" type="button" data-action="delete" data-id="${p.id}" data-name="${Helpers.escapeHtml(p.name)}" title="حذف المنتج"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`).join('');
}

/** إجراءات جدول المنتجات: تعديل المخزون / الحذف */
async function onProductAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);

  if (btn.dataset.action === 'stock') {
    openStockModal(id);
    return;
  }

  if (btn.dataset.action === 'delete') {
    const confirmed = await Components.confirm({
      title: 'حذف المنتج',
      message: `هل أنت متأكد من حذف «${btn.dataset.name}»؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'نعم، حذف'
    });
    if (!confirmed) return;

    try {
      await Api.del(`/products/${id}`);
      Components.toast('تم حذف المنتج بنجاح', 'success');
      loadProducts();
    } catch (err) {
      Components.toast(err.message || 'تعذر حذف المنتج', 'error');
    }
  }
}

let currentStockProduct = null;

async function openStockModal(id) {
  try {
    const res = await Api.get(`/products/${id}`);
    currentStockProduct = res.data;
    document.getElementById('stock-product-name').textContent = currentStockProduct.name;
    document.getElementById('stock-current').textContent = `الحالي: ${Helpers.formatNumber(currentStockProduct.quantity)}`;
    document.getElementById('stock-quantity').value = currentStockProduct.quantity;
    document.getElementById('stock-new-preview').textContent = Helpers.formatNumber(currentStockProduct.quantity);
    Helpers.setFieldError(document.getElementById('stock-quantity'), null);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('stock-modal')).show();
  } catch (err) {
    Components.toast(err.message || 'تعذر جلب بيانات المنتج', 'error');
  }
}

async function saveStock(e) {
  e.preventDefault();
  if (!currentStockProduct) return;
  const { valid } = Helpers.validateForm(e.target);
  if (!valid) return;

  const quantity = Number(document.getElementById('stock-quantity').value);
  const saveBtn = document.getElementById('stock-save-btn');
  setBtnLoading(saveBtn, true, 'جارٍ الحفظ...');

  try {
    await Api.put(`/products/${currentStockProduct.id}/stock`, { quantity });
    Components.toast('تم تحديث المخزون بنجاح', 'success');
    bootstrap.Modal.getOrCreateInstance(document.getElementById('stock-modal')).hide();
    loadProducts();
  } catch (err) {
    Components.toast(err.message || 'تعذر تحديث المخزون', 'error');
  } finally {
    setBtnLoading(saveBtn, false);
  }
}

/* ============================================================
   صفحة إضافة / تعديل منتج
   ============================================================ */

async function initProductFormPage() {
  const editId = Helpers.getUrlParam('id');
  const isEdit = !!editId;

  await Components.initAppPage({
    active: 'products',
    pageTitle: isEdit ? 'تعديل منتج' : 'إضافة منتج',
    breadcrumb: [
      { title: 'لوحة التحكم', href: 'dashboard.html' },
      { title: 'المنتجات', href: 'products.html' },
      { title: isEdit ? 'تعديل منتج' : 'إضافة منتج' }
    ]
  });

  /* نموذج الإضافة يحتاج التصنيفات أيضًا، وليس نموذج التعديل فقط. */
  if (!isEdit) await loadCategoryOptions();

  if (isEdit) {
    document.getElementById('form-page-title').textContent = 'تعديل منتج';
    await loadProductForEdit(editId);
  }

  /* توليد SKU تلقائيًا */
  document.getElementById('pf-sku-generate').addEventListener('click', () => {
    document.getElementById('pf-sku').value = `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
  });

  /* إرشاد هامش الربح */
  const marginHint = () => {
    const cost = Number(document.getElementById('pf-cost').value) || 0;
    const price = Number(document.getElementById('pf-price').value) || 0;
    const hint = document.getElementById('pf-margin-hint');
    if (cost > 0 && price > 0) {
      const profit = price - cost;
      const pct = Math.round((profit / price) * 100);
      hint.textContent = `هامش الربح: ${Helpers.formatCurrency(profit)} (${pct}%)`;
      hint.className = 'form-text ' + (profit > 0 ? 'text-success' : 'text-danger') + ' fw-bold';
    } else {
      hint.textContent = '';
    }
  };
  document.getElementById('pf-cost').addEventListener('input', marginHint);
  document.getElementById('pf-price').addEventListener('input', marginHint);

  /* معاينة الصورة (رابط أو رفع من الجهاز) */
  document.getElementById('pf-image').addEventListener('input', (e) => {
    setImagePreview(e.target.value.trim());
  });
  document.getElementById('pf-image-upload').addEventListener('click', () => {
    document.getElementById('pf-image-file').click();
  });
  document.getElementById('pf-image-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await Helpers.readImageFile(file);
      document.getElementById('pf-image').value = dataUrl;
      setImagePreview(dataUrl);
    } catch (err) {
      Components.toast(err.message, 'error');
    }
    e.target.value = '';
  });
  document.getElementById('pf-image-remove').addEventListener('click', () => {
    document.getElementById('pf-image').value = '';
    setImagePreview('');
  });

  document.getElementById('product-form').addEventListener('submit', (e) => submitProductForm(e, editId));
}

function setImagePreview(src) {
  const preview = document.getElementById('pf-image-preview');
  if (src) {
    preview.innerHTML = `<img src="${Helpers.escapeHtml(src)}" alt="معاينة الصورة">`;
  } else {
    preview.innerHTML = '<i class="bi bi-image" style="font-size:2rem"></i>';
  }
}

async function loadProductForEdit(id) {
  try {
    const res = await Api.get(`/products/${id}`);
    const p = res.data;
    document.getElementById('pf-name').value = p.name || '';
    document.getElementById('pf-sku').value = p.sku || '';
    document.getElementById('pf-description').value = p.description || '';
    document.getElementById('pf-cost').value = p.cost ?? '';
    document.getElementById('pf-price').value = p.price ?? '';
    document.getElementById('pf-quantity').value = p.quantity ?? 0;
    document.getElementById('pf-min-stock').value = p.min_stock ?? 0;
    document.getElementById('pf-color').value = p.color || '';
    document.getElementById('pf-size').value = p.size || '';
    document.getElementById('pf-material').value = p.material || '';
    document.getElementById('pf-image').value = p.image || '';
    setImagePreview(p.image || '');

    /* التصنيف يُحدد بعد تحميل القائمة */
    await loadCategoryOptions(p.category_id);
  } catch (err) {
    Components.toast(err.message || 'تعذر جلب بيانات المنتج', 'error');
    setTimeout(() => location.replace('products.html'), 900);
  }
}

async function loadCategoryOptions(selectedId) {
  try {
    const res = await Api.get('/categories', { per_page: 100 });
    const select = document.getElementById('pf-category');
    (res.data || []).forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = Helpers.escapeHtml(c.name);
      if (String(c.id) === String(selectedId)) opt.selected = true;
      select.appendChild(opt);
    });
  } catch { /* لا توجد تصنيفات */ }
}

async function submitProductForm(e, editId) {
  e.preventDefault();
  const form = e.target;
  const { valid, data } = Helpers.validateForm(form);
  if (!valid) return;

  /* تحقق منطقي: سعر البيع أكبر من صفر */
  if (Number(data.price) <= 0) {
    Helpers.setFieldError(document.getElementById('pf-price'), 'سعر البيع يجب أن يكون أكبر من صفر');
    return;
  }

  const payload = {
    name: data.name,
    sku: document.getElementById('pf-sku').value.trim(),
    category_id: data.category_id,
    description: document.getElementById('pf-description').value.trim(),
    image: document.getElementById('pf-image').value.trim() || null,
    cost: Number(data.cost) || 0,
    price: Number(data.price) || 0,
    quantity: Number(data.quantity) || 0,
    min_stock: Number(document.getElementById('pf-min-stock').value) || 0,
    color: document.getElementById('pf-color').value.trim(),
    size: document.getElementById('pf-size').value.trim(),
    material: document.getElementById('pf-material').value.trim()
  };

  const submitBtn = document.getElementById('pf-submit');
  setBtnLoading(submitBtn, true, 'جارٍ الحفظ...');

  try {
    if (editId) {
      await Api.put(`/products/${editId}`, payload);
      Components.toast('تم تحديث المنتج بنجاح', 'success');
    } else {
      await Api.post('/products', payload);
      Components.toast('تم إضافة المنتج بنجاح', 'success');
    }
    setTimeout(() => location.replace('products.html'), 700);
  } catch (err) {
    Components.toast(err.message || 'تعذر حفظ المنتج', 'error');
    setBtnLoading(submitBtn, false);
  }
}

/* ============================================================
   صفحة التصنيفات
   ============================================================ */

async function initCategoriesPage() {
  const user = await Components.initAppPage({
    active: 'categories',
    pageTitle: 'التصنيفات',
    breadcrumb: [{ title: 'لوحة التحكم', href: 'dashboard.html' }, { title: 'المنتجات', href: 'products.html' }, { title: 'التصنيفات' }]
  });
  if (!user) return;

  document.getElementById('btn-add-category').addEventListener('click', () => openCategoryModal(null));
  document.getElementById('categories-body').addEventListener('click', onCategoryAction);
  document.getElementById('category-form').addEventListener('submit', submitCategoryForm);

  loadCategories();
}

async function loadCategories() {
  const body = document.getElementById('categories-body');
  body.innerHTML = Components.tableSkeleton(4, 5);

  try {
    const res = await Api.get('/categories', { per_page: 100 });
    const cats = res.data || [];
    if (!cats.length) {
      body.innerHTML = `<tr><td colspan="4">${Components.emptyState({
        icon: 'bi-tags',
        title: 'لا توجد تصنيفات',
        message: 'أنشئ تصنيفات لتنظيم منتجاتك في مجموعات',
        actionHtml: '<button class="btn btn-primary" type="button" onclick="openCategoryModal(null)"><i class="bi bi-plus-lg me-1"></i>إضافة تصنيف</button>'
      })}</td></tr>`;
      return;
    }
    body.innerHTML = cats.map((c) => `
      <tr>
        <td><span class="cell-main"><i class="bi bi-tag text-primary me-1"></i>${Helpers.escapeHtml(c.name)}</span></td>
        <td class="d-none d-md-table-cell text-muted">${Helpers.escapeHtml(c.description || '—')}</td>
        <td><span class="badge badge-soft-primary">${Helpers.formatNumber(c.products_count)} منتج</span></td>
        <td class="cell-actions">
          <button class="btn-icon text-primary" type="button" data-action="edit" data-id="${c.id}" title="تعديل"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon text-danger" type="button" data-action="delete" data-id="${c.id}" data-name="${Helpers.escapeHtml(c.name)}" title="حذف"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch (err) {
    body.innerHTML = `<tr><td colspan="4">${Components.errorState(err.message)}</td></tr>`;
  }
}

function openCategoryModal(category) {
  document.getElementById('category-id').value = category ? category.id : '';
  document.getElementById('category-name').value = category ? category.name : '';
  document.getElementById('category-description').value = category ? (category.description || '') : '';
  document.getElementById('category-modal-title').innerHTML = category
    ? '<i class="bi bi-pencil-square me-1 text-primary"></i>تعديل التصنيف'
    : '<i class="bi bi-tag me-1 text-primary"></i>إضافة تصنيف';
  Helpers.setFieldError(document.getElementById('category-name'), null);
  bootstrap.Modal.getOrCreateInstance(document.getElementById('category-modal')).show();
}

async function onCategoryAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  if (btn.dataset.action === 'edit') {
    try {
      const res = await Api.get('/categories', { per_page: 100 });
      const cat = (res.data || []).find((c) => String(c.id) === String(btn.dataset.id));
      if (cat) openCategoryModal(cat);
    } catch (err) {
      Components.toast(err.message, 'error');
    }
    return;
  }

  if (btn.dataset.action === 'delete') {
    const confirmed = await Components.confirm({
      title: 'حذف التصنيف',
      message: `هل أنت متأكد من حذف تصنيف «${btn.dataset.name}»؟`,
      confirmText: 'نعم، حذف'
    });
    if (!confirmed) return;
    try {
      await Api.del(`/categories/${btn.dataset.id}`);
      Components.toast('تم حذف التصنيف بنجاح', 'success');
      loadCategories();
    } catch (err) {
      Components.toast(err.message || 'تعذر حذف التصنيف', 'error');
    }
  }
}

async function submitCategoryForm(e) {
  e.preventDefault();
  const { valid, data } = Helpers.validateForm(e.target);
  if (!valid) return;

  const id = document.getElementById('category-id').value;
  const saveBtn = document.getElementById('category-save-btn');
  setBtnLoading(saveBtn, true, 'جارٍ الحفظ...');

  try {
    if (id) {
      await Api.put(`/categories/${id}`, { name: data.name, description: data.description });
      Components.toast('تم تحديث التصنيف بنجاح', 'success');
    } else {
      await Api.post('/categories', { name: data.name, description: data.description });
      Components.toast('تم إضافة التصنيف بنجاح', 'success');
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('category-modal')).hide();
    loadCategories();
  } catch (err) {
    Components.toast(err.message || 'تعذر حفظ التصنيف', 'error');
  } finally {
    setBtnLoading(saveBtn, false);
  }
}

/* إتاحة فتح النافذة من Empty State */
window.openCategoryModal = openCategoryModal;
