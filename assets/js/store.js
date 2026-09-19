'use strict';

/* ============================================================
   ShopFlow — المتجر الإلكتروني (store.html / cart.html / checkout.html)
   صفحات عامة لا تتطلب تسجيل دخول + سلة مشتريات في localStorage
   ============================================================ */

const CART_KEY = 'shopflow_cart';

/* ---------- سلة المشتريات (localStorage) ---------- */
const StoreCart = {

  get() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    Components.updateCartBadge(this.count());
  },

  /** إضافة منتج للسلة (مع منع تجاوز الكمية المتاحة) */
  add(product) {
    const items = this.get();
    const line = items.find((i) => String(i.product_id) === String(product.id));
    if (line) {
      if (line.quantity >= product.quantity) {
        return { ok: false, message: `الكمية المتاحة من «${product.name}» هي ${product.quantity} فقط` };
      }
      line.quantity += 1;
    } else {
      if (product.quantity < 1) return { ok: false, message: 'هذا المنتج غير متوفر حاليًا' };
      items.push({
        product_id: product.id, name: product.name, price: Number(product.price) || 0,
        image: product.image || null, quantity: 1, stock: Number(product.quantity) || 0
      });
    }
    this.save(items);
    return { ok: true };
  },

  setQty(productId, qty) {
    const items = this.get();
    const line = items.find((i) => String(i.product_id) === String(productId));
    if (!line) return;
    const max = line.stock || 99;
    line.quantity = Math.min(Math.max(1, Math.floor(Number(qty) || 1)), max);
    this.save(items);
  },

  remove(productId) {
    this.save(this.get().filter((i) => String(i.product_id) !== String(productId)));
  },

  clear() {
    this.save([]);
  },

  count() {
    return this.get().reduce((s, i) => s + i.quantity, 0);
  },

  total() {
    return this.get().reduce((s, i) => s + i.price * i.quantity, 0);
  }
};

/* ============================================================
   صفحة المتجر — store.html
   ============================================================ */
const StorePage = {
  state: { search: '', category_id: '', page: 1, lastPage: 1, products: [], categories: [] },

  async init() {
    Components.initStorePage({ active: 'store', withSearch: true });
    Components.updateCartBadge(StoreCart.count());

    await Api.ensureMode();

    const heroTitle = document.getElementById('store-hero-title');
    if (heroTitle) {
      const settings = Helpers.getSettings();
      const name = settings.store_name || (Auth.getUser() || {}).store?.name;
      if (name) heroTitle.textContent = `أهلًا بك في ${name}`;
    }

    const searchInput = document.getElementById('store-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', Helpers.debounce(() => {
        this.state.search = searchInput.value.trim();
        this.loadProducts(true);
      }, 350));
    }

    document.getElementById('store-more').addEventListener('click', () => {
      this.state.page += 1;
      this.loadProducts(false);
    });
    document.getElementById('store-products').addEventListener('click', (e) => {
      if (e.target.closest('[data-action="retry-load"]')) {
        this.loadProducts(true);
        return;
      }
      const btn = e.target.closest('[data-add]');
      if (!btn) return;
      const product = this.state.products.find((p) => String(p.id) === String(btn.dataset.add));
      if (!product) return;
      const res = StoreCart.add(product);
      if (res.ok) Components.toast(`تمت إضافة «${product.name}» إلى السلة`, 'success');
      else Components.toast(res.message, 'warning');
    });

    await this.loadProducts(true);
  },

  async loadProducts(reset) {
    const grid = document.getElementById('store-products');
    if (reset) {
      this.state.page = 1;
      grid.innerHTML = Array.from({ length: 8 }, () => this.productSkeleton()).join('');
    }

    try {
      const res = await Api.get('/store/products', {
        search: this.state.search || undefined,
        category_id: this.state.category_id || undefined,
        page: this.state.page
      });
      const list = res.data || [];
      const meta = res.meta || {};
      this.state.lastPage = meta.last_page || 1;

      if (reset) {
        this.state.products = list;
        this.buildChips(list);
        grid.innerHTML = list.length
          ? list.map((p) => this.productCard(p)).join('')
          : Components.emptyState({ icon: 'bi-search', title: 'لا توجد منتجات مطابقة', message: 'جرّب كلمة بحث أخرى أو تصنيفًا مختلفًا' });
      } else {
        this.state.products = this.state.products.concat(list);
        grid.insertAdjacentHTML('beforeend', list.map((p) => this.productCard(p)).join(''));
      }

      const moreBox = document.getElementById('store-more-box');
      moreBox.classList.toggle('d-none', this.state.page >= this.state.lastPage);
    } catch (err) {
      grid.innerHTML = Components.errorState(err.message || 'تعذر جلب منتجات المتجر', 'retry');
    }
  },

  /** بناء شرائح التصنيفات من المنتجات المعروضة (متاح بدون تسجيل دخول) */
  buildChips(products) {
    const seen = new Map();
    products.forEach((p) => {
      if (p.category_id && !seen.has(String(p.category_id))) {
        seen.set(String(p.category_id), p.category_name || 'تصنيف');
      }
    });
    this.state.categories = [...seen.entries()];

    const box = document.getElementById('store-chips');
    box.innerHTML = `
      <button type="button" class="chip ${this.state.category_id === '' ? 'active' : ''}" data-cat="">الكل</button>
      ${this.state.categories.map(([id, name]) => `
        <button type="button" class="chip ${this.state.category_id === id ? 'active' : ''}" data-cat="${Helpers.escapeHtml(id)}">
          ${Helpers.escapeHtml(name)}
        </button>`).join('')}`;

    box.onclick = (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      this.state.category_id = chip.dataset.cat;
      box.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c === chip));
      this.loadProducts(true);
    };
  },

  productCard(p) {
    const esc = Helpers.escapeHtml;
    return `
      <div class="col">
        <div class="product-card">
          <div class="product-img">
            ${p.image
              ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`
              : '<i class="bi bi-image"></i>'}
          </div>
          <div class="product-body">
            <h3 class="product-name">${esc(p.name)}</h3>
            <div class="product-category">${esc(p.category_name || '')}</div>
            ${p.description ? `<p class="product-desc">${esc(p.description)}</p>` : ''}
            <div class="d-flex align-items-center justify-content-between mt-auto pt-2">
              <span class="product-price">${Helpers.formatCurrency(p.price)}</span>
              <button type="button" class="btn btn-primary btn-sm" data-add="${esc(p.id)}">
                <i class="bi bi-cart-plus me-1"></i>أضف
              </button>
            </div>
            ${p.quantity <= 5 ? `<div class="product-category mt-1"><i class="bi bi-exclamation-triangle text-warning me-1"></i>المتوفر: ${Helpers.formatNumber(p.quantity)}</div>` : ''}
          </div>
        </div>
      </div>`;
  },

  productSkeleton() {
    return `
      <div class="col">
        <div class="product-card">
          <span class="skeleton d-block w-100" style="aspect-ratio:4/3;border-radius:0"></span>
          <div class="product-body">
            <span class="skeleton d-block" style="height:16px;width:80%"></span>
            <span class="skeleton d-block" style="height:12px;width:50%"></span>
            <span class="skeleton d-block mt-2" style="height:30px;width:45%"></span>
          </div>
        </div>
      </div>`;
  }
};

/* ============================================================
   صفحة السلة — cart.html
   ============================================================ */
const CartPage = {

  init() {
    Components.initStorePage({ active: 'cart' });
    Components.updateCartBadge(StoreCart.count());
    this.render();
  },

  render() {
    const box = document.getElementById('cart-content');
    const items = StoreCart.get();

    if (!items.length) {
      box.innerHTML = `<div class="card">
        <div class="card-body py-5">
          ${Components.emptyState({
            icon: 'bi-cart-x',
            title: 'سلة المشتريات فارغة',
            message: 'لم تقم بإضافة أي منتجات بعد',
            actionHtml: '<a class="btn btn-primary" href="store.html"><i class="bi bi-bag me-1"></i>متابعة التسوق</a>'
          })}
        </div>
      </div>`;
      return;
    }

    const esc = Helpers.escapeHtml;
    const rows = items.map((it) => `
      <tr data-line="${esc(it.product_id)}">
        <td>
          <div class="d-flex align-items-center gap-2">
            ${it.image
              ? `<span class="cell-thumb"><img src="${esc(it.image)}" alt="${esc(it.name)}"></span>`
              : '<span class="cell-thumb"><i class="bi bi-image"></i></span>'}
            <div>
              <div class="fw-semibold">${esc(it.name)}</div>
              <div class="text-secondary small">${Helpers.formatCurrency(it.price)} للوحدة</div>
            </div>
          </div>
        </td>
        <td>
          <div class="qty-group">
            <button type="button" class="qty-btn" data-qty="minus"><i class="bi bi-dash"></i></button>
            <input type="number" class="form-control" value="${it.quantity}" min="1" max="${it.stock || 99}" inputmode="numeric">
            <button type="button" class="qty-btn" data-qty="plus"><i class="bi bi-plus"></i></button>
          </div>
        </td>
        <td class="fw-bold">${Helpers.formatCurrency(it.price * it.quantity)}</td>
        <td>
          <button type="button" class="btn btn-soft-danger btn-sm" data-remove="${esc(it.product_id)}" aria-label="حذف من السلة">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`).join('');

    box.innerHTML = `
      <div class="row g-3">
        <div class="col-lg-8">
          <div class="card table-card">
            <div class="card-header">
              <span><i class="bi bi-cart3 me-1"></i>منتجات السلة (${Helpers.formatNumber(items.length)})</span>
              <button type="button" class="btn btn-soft-danger btn-sm" id="cart-clear">
                <i class="bi bi-trash me-1"></i>إفراغ السلة
              </button>
            </div>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead><tr><th>المنتج</th><th>الكمية</th><th>الإجمالي</th><th></th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="card">
            <div class="card-header"><i class="bi bi-receipt me-1"></i>ملخص الطلب</div>
            <div class="card-body">
              <div class="d-flex justify-content-between mb-2">
                <span class="text-secondary">عدد القطع</span>
                <span class="fw-semibold">${Helpers.formatNumber(StoreCart.count())}</span>
              </div>
              <div class="d-flex justify-content-between mb-3">
                <span class="text-secondary">الإجمالي</span>
                <span class="fw-bold fs-5 text-primary">${Helpers.formatCurrency(StoreCart.total())}</span>
              </div>
              <a class="btn btn-primary w-100 mb-2" href="checkout.html">
                <i class="bi bi-clipboard-check me-1"></i>إتمام الطلب
              </a>
              <a class="btn btn-soft-secondary w-100" href="store.html">
                <i class="bi bi-arrow-right me-1"></i>متابعة التسوق
              </a>
            </div>
          </div>
        </div>
      </div>`;

    this.bindCartEvents();
  },

  bindCartEvents() {
    const box = document.getElementById('cart-content');

    // +/− وتعديل الكمية
    box.querySelectorAll('tbody tr').forEach((tr) => {
      const id = tr.dataset.line;
      const input = tr.querySelector('input');
      tr.querySelectorAll('.qty-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const step = btn.dataset.qty === 'plus' ? 1 : -1;
          StoreCart.setQty(id, (Number(input.value) || 1) + step);
          this.render();
        });
      });
      input.addEventListener('change', () => {
        StoreCart.setQty(id, input.value);
        this.render();
      });
    });

    // حذف صنف
    box.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        StoreCart.remove(btn.dataset.remove);
        Components.toast('تم حذف المنتج من السلة', 'info');
        this.render();
      });
    });

    // إفراغ السلة
    document.getElementById('cart-clear').addEventListener('click', async () => {
      const ok = await Components.confirm({
        title: 'إفراغ السلة',
        message: 'سيتم حذف جميع المنتجات من سلة المشتريات. هل أنت متأكد؟',
        confirmText: 'نعم، إفراغ السلة'
      });
      if (!ok) return;
      StoreCart.clear();
      this.render();
    });
  }
};

/* ============================================================
   صفحة إتمام الطلب — checkout.html
   ============================================================ */
const CheckoutPage = {

  init() {
    Components.initStorePage({ active: 'checkout' });
    Components.updateCartBadge(StoreCart.count());
    this.render();
  },

  render() {
    const box = document.getElementById('checkout-content');
    const items = StoreCart.get();

    if (!items.length) {
      box.innerHTML = `<div class="card">
        <div class="card-body py-5">
          ${Components.emptyState({
            icon: 'bi-cart-x',
            title: 'لا يمكن إتمام الطلب',
            message: 'سلة المشتريات فارغة',
            actionHtml: '<a class="btn btn-primary" href="store.html"><i class="bi bi-bag me-1"></i>متابعة التسوق</a>'
          })}
        </div>
      </div>`;
      return;
    }

    const esc = Helpers.escapeHtml;
    const summaryRows = items.map((it) => `
      <div class="d-flex justify-content-between py-2 border-bottom">
        <span class="min-w-0">
          ${esc(it.name)}
          <span class="text-secondary">× ${Helpers.formatNumber(it.quantity)}</span>
        </span>
        <span class="fw-semibold flex-shrink-0">${Helpers.formatCurrency(it.price * it.quantity)}</span>
      </div>`).join('');

    box.innerHTML = `
      <div class="row g-3">
        <div class="col-lg-7">
          <div class="card">
            <div class="card-header"><i class="bi bi-person-lines-fill me-1"></i>بيانات التوصيل</div>
            <div class="card-body">
              <form id="checkout-form" novalidate>
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label" for="co-name">الاسم الكامل <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="co-name" data-validate="required|min:2" placeholder="مثال: أحمد محمد">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label" for="co-phone">رقم الهاتف <span class="text-danger">*</span></label>
                    <input type="tel" class="form-control input-ltr" id="co-phone" data-validate="required|phone" placeholder="05xxxxxxxx">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label" for="co-method">طريقة الاستلام</label>
                    <select class="form-select" id="co-method">
                      <option value="pickup">استلام من المتجر</option>
                      <option value="delivery">توصيل للمنزل</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label" for="co-address">العنوان <span class="text-danger d-none" id="co-address-star">*</span></label>
                    <input type="text" class="form-control" id="co-address" placeholder="المدينة - الحي - الشارع">
                  </div>
                  <div class="col-12">
                    <label class="form-label" for="co-notes">ملاحظات إضافية</label>
                    <textarea class="form-control" id="co-notes" rows="3" placeholder="أي تفاصيل تود إبلاغنا بها..."></textarea>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary btn-lg w-100 mt-4" id="co-submit">
                  <i class="bi bi-check2-circle me-1"></i>تأكيد الطلب (${Helpers.formatCurrency(StoreCart.total())})
                </button>
                <p class="text-secondary small text-center mt-2 mb-0">
                  <i class="bi bi-shield-check me-1"></i>سنتواصل معك هاتفيًا لتأكيد الطلب
                </p>
              </form>
            </div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="card">
            <div class="card-header"><i class="bi bi-receipt me-1"></i>ملخص الطلب</div>
            <div class="card-body">
              ${summaryRows}
              <div class="d-flex justify-content-between align-items-center pt-3">
                <span class="fw-bold">الإجمالي النهائي</span>
                <span class="fw-bold fs-4 text-primary">${Helpers.formatCurrency(StoreCart.total())}</span>
              </div>
              <a class="btn btn-soft-secondary w-100 mt-3" href="cart.html">
                <i class="bi bi-cart3 me-1"></i>العودة للسلة
              </a>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('co-method').addEventListener('change', (e) => {
      document.getElementById('co-address-star').classList.toggle('d-none', e.target.value !== 'delivery');
    });

    document.getElementById('checkout-form').addEventListener('submit', (e) => this.submit(e));
  },

  async submit(e) {
    e.preventDefault();
    const form = e.target;
    const validation = Helpers.validateForm(form);
    if (!validation.valid) return;

    // العنوان إلزامي عند اختيار التوصيل
    const method = document.getElementById('co-method').value;
    const addressInput = document.getElementById('co-address');
    if (method === 'delivery' && !addressInput.value.trim()) {
      Helpers.setFieldError(addressInput, 'العنوان مطلوب عند اختيار التوصيل');
      addressInput.focus();
      return;
    }

    const btn = document.getElementById('co-submit');
    setBtnLoading(btn, true, 'جارٍ إرسال الطلب...');

    try {
      const res = await Api.post('/store/orders', {
        customer_name: document.getElementById('co-name').value.trim(),
        phone: document.getElementById('co-phone').value.trim(),
        address: addressInput.value.trim(),
        delivery_method: method,
        notes: document.getElementById('co-notes').value.trim(),
        items: StoreCart.get().map((i) => ({ product_id: i.product_id, quantity: i.quantity }))
      });

      const order = res.data || {};
      StoreCart.clear();
      this.renderSuccess(order, res.message);
    } catch (err) {
      Components.toast(err.message || 'تعذر إرسال الطلب، حاول مرة أخرى', 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  },

  renderSuccess(order, message) {
    document.getElementById('checkout-content').innerHTML = `
      <div class="card mx-auto" style="max-width:560px">
        <div class="card-body text-center py-5">
          <div class="mb-3">
            <span class="stat-icon icon-success mx-auto" style="width:84px;height:84px;font-size:2.4rem">
              <i class="bi bi-check-lg"></i>
            </span>
          </div>
          <h3 class="fw-bold mb-2">تم استلام طلبك بنجاح!</h3>
          <p class="text-secondary mb-3">${Helpers.escapeHtml(message || 'سنتواصل معك قريبًا لتأكيد الطلب')}</p>
          ${order.order_no ? `
            <div class="d-flex justify-content-center gap-3 mb-4">
              <span class="badge badge-soft-primary fs-6 p-2"><i class="bi bi-receipt me-1"></i>رقم الطلب: ${Helpers.escapeHtml(order.order_no)}</span>
              <span class="badge badge-soft-success fs-6 p-2"><i class="bi bi-cash me-1"></i>${Helpers.formatCurrency(order.total)}</span>
            </div>` : ''}
          <a class="btn btn-primary" href="store.html"><i class="bi bi-bag me-1"></i>متابعة التسوق</a>
        </div>
      </div>`;
  }
};

/* ---------- التوجيه حسب الصفحة ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;
  if (page === 'store') await StorePage.init();
  if (page === 'cart') CartPage.init();
  if (page === 'checkout') CheckoutPage.init();
});
