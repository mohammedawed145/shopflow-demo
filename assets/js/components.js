'use strict';

/* ============================================================
   ShopFlow — مكونات واجهة قابلة لإعادة الاستخدام
   (Sidebar / Navbar / Footer / Toast / Confirm / Loader / ...)
   ============================================================ */

/* عناصر القائمة الجانبية المشتركة بين كل صفحات التطبيق */
const SIDEBAR_ITEMS = [
  { id: 'main', label: 'القائمة الرئيسية', type: 'label' },
  { id: 'dashboard', href: 'dashboard.html', icon: 'bi-speedometer2', label: 'لوحة التحكم' },
  { id: 'products', href: 'products.html', icon: 'bi-box-seam', label: 'المنتجات' },
  { id: 'categories', href: 'categories.html', icon: 'bi-tags', label: 'التصنيفات' },
  { id: 'customers', href: 'customers.html', icon: 'bi-people', label: 'العملاء' },
  { id: 'suppliers', href: 'suppliers.html', icon: 'bi-truck', label: 'الموردون' },
  { id: 'sales', href: 'sales.html', icon: 'bi-receipt', label: 'المبيعات والفواتير' },
  { id: 'purchases', href: 'purchases.html', icon: 'bi-bag-plus', label: 'المشتريات' },
  { id: 'expenses', href: 'expenses.html', icon: 'bi-cash-coin', label: 'المصروفات' },
  { id: 'reports', href: 'reports.html', icon: 'bi-graph-up-arrow', label: 'التقارير' },
  { id: 'settings', href: 'settings.html', icon: 'bi-gear', label: 'إعدادات المتجر' },
  { type: 'divider' },
  { id: 'store', href: 'store.html', icon: 'bi-shop-window', label: 'المتجر الإلكتروني', external: true }
];

const ROLE_LABELS = { owner: 'صاحب المحل', admin: 'مدير', staff: 'موظف' };

const NOTIF_ICONS = {
  stock: { icon: 'bi-box-seam', cls: 'icon-warning' },
  sale: { icon: 'bi-receipt', cls: 'icon-success' },
  payment: { icon: 'bi-cash-stack', cls: 'icon-success' },
  order: { icon: 'bi-cart-check', cls: 'icon-primary' },
  purchase: { icon: 'bi-bag-plus', cls: 'icon-info' }
};

const Components = {
  _loaderCount: 0,

  /* ============================================================
     تهيئة صفحة تطبيق كاملة: حماية + تخطيط + إشعارات
     ============================================================ */
  async initAppPage({ active = '', breadcrumb = null, pageTitle = '' } = {}) {
    const user = Auth.requireAuth();
    if (!user) return null;

    await Api.ensureMode();
    this.renderShell(user, active, pageTitle);
    Helpers.I18n.translate(document.body);
    if (breadcrumb) this.renderBreadcrumb(breadcrumb);
    this.applyRoles(user);
    this.syncSettings();
    this.loadNotifications();
    return user;
  },

  /** رسم الهيكل العام (القائمة الجانبية + الشريط العلوي + التذييل) */
  renderShell(user, active, pageTitle) {
    if (document.getElementById('sf-sidebar')) return;

    const storeName = (user.store && user.store.name) || 'متجر ShopFlow';
    const esc = (v) => Helpers.escapeHtml(v);

    document.body.insertAdjacentHTML('afterbegin', `
      <aside class="app-sidebar" id="sf-sidebar">
        <a class="sidebar-brand" href="dashboard.html">
          <img src="assets/images/logo.svg" alt="شعار ${esc(storeName)}">
          <span>
            <span class="brand-name" id="sf-store-name">${esc(storeName)}</span>
            <span class="brand-sub">نظام إدارة المحلات</span>
          </span>
        </a>
        <nav class="sidebar-nav">
          ${SIDEBAR_ITEMS.map((item) => {
            if (item.type === 'label') return `<span class="sidebar-label">${esc(item.label)}</span>`;
            if (item.type === 'divider') return '<div class="sidebar-divider"></div>';
            return `<a class="sidebar-link ${active === item.id ? 'active' : ''}" href="${item.href}">
              <i class="bi ${item.icon}"></i><span>${esc(item.label)}</span>
              ${item.external ? '<i class="bi bi-box-arrow-up-left ms-auto" style="font-size:.7rem"></i>' : ''}
            </a>`;
          }).join('')}
        </nav>
        <div class="sidebar-footer">ShopFlow · الإصدار 1.0.0</div>
      </aside>
      <div class="sidebar-backdrop" id="sf-sidebar-backdrop"></div>
    `);

    const shell = document.getElementById('app-shell');
    shell.insertAdjacentHTML('afterbegin', this.navbarHtml(user, pageTitle));
    shell.insertAdjacentHTML('beforeend', `
      <footer class="app-footer no-print">
        © 2026 ShopFlow — <span id="sf-footer-store">${esc(storeName)}</span> · جميع الحقوق محفوظة
      </footer>
    `);
    document.querySelector('.standalone-lang-switcher')?.remove();

    this.bindShellEvents();
  },

  navbarHtml(user, pageTitle) {
    const esc = (v) => Helpers.escapeHtml(v);
    const storeName = (user.store && user.store.name) || 'ShopFlow';
    const roleLabel = ROLE_LABELS[user.role] || user.role || 'مستخدم';

    return `
      <nav class="app-navbar no-print">
        <button class="navbar-toggle" id="sf-sidebar-toggle" type="button" aria-label="فتح القائمة الجانبية">
          <i class="bi bi-list"></i>
        </button>
        <h1 class="navbar-title">${esc(pageTitle || storeName)}</h1>

        <div class="navbar-side">
          <button class="lang-switcher" type="button" data-action="toggle-language" title="تغيير اللغة">
            <i class="bi bi-translate"></i><span>${Helpers.I18n.lang === 'ar' ? 'EN' : 'عربي'}</span>
          </button>
          <span id="sf-demo-chip-box">${Api.isDemo() ? this.demoChipHtml() : ''}</span>

          <div class="dropdown">
            <button class="icon-btn" type="button" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-label="الإشعارات">
              <i class="bi bi-bell"></i>
              <span class="icon-badge" id="sf-notif-badge" style="display:none">0</span>
            </button>
            <div class="dropdown-menu dropdown-menu-end notif-dropdown">
              <div class="notif-head">
                <span><i class="bi bi-bell"></i> الإشعارات</span>
                <button type="button" class="btn btn-sm btn-soft-primary" id="sf-notif-readall">تحديد الكل كمقروء</button>
              </div>
              <div class="notif-list" id="sf-notif-list">
                <div class="notif-empty"><span class="spinner-border spinner-border-sm"></span></div>
              </div>
            </div>
          </div>

          <div class="dropdown">
            <button class="user-chip" type="button" data-bs-toggle="dropdown" aria-label="قائمة المستخدم">
              <span class="sf-avatar">${esc(Helpers.getInitials(user.name))}</span>
              <span class="user-info text-start">
                <span class="user-name">${esc(user.name)}</span>
                <span class="user-role">${esc(roleLabel)}</span>
              </span>
              <i class="bi bi-chevron-down" style="font-size:.7rem;color:#94A3B8"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li><h6 class="dropdown-header">${esc(user.email || user.phone || '')}</h6></li>
              <li><a class="dropdown-item" href="settings.html"><i class="bi bi-gear"></i>إعدادات المتجر</a></li>
              <li><a class="dropdown-item" href="store.html"><i class="bi bi-shop-window"></i>المتجر الإلكتروني</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><button class="dropdown-item text-danger" type="button" data-action="logout"><i class="bi bi-box-arrow-left"></i>تسجيل الخروج</button></li>
            </ul>
          </div>
        </div>
      </nav>`;
  },

  demoChipHtml() {
    return `<a class="demo-chip" href="settings.html" title="العملة الحالية بالبيانات التجريبية — اضغط للإعدادات">
      <i class="bi bi-flask"></i><span class="chip-text">وضع تجريبي</span></a>`;
  },

  bindShellEvents() {
    const sidebar = document.getElementById('sf-sidebar');
    const backdrop = document.getElementById('sf-sidebar-backdrop');
    const toggle = document.getElementById('sf-sidebar-toggle');

    const closeSidebar = () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
    };

    if (toggle) {
      toggle.addEventListener('click', () => {
        const open = sidebar.classList.toggle('open');
        backdrop.classList.toggle('show', open);
      });
    }
    if (backdrop) backdrop.addEventListener('click', closeSidebar);
    if (sidebar) {
      sidebar.addEventListener('click', (e) => {
        if (e.target.closest('a')) closeSidebar();
      });
    }

    /* تسجيل الخروج من أي زر data-action="logout" */
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="logout"]')) {
        Auth.logout('logout');
      }
      if (e.target.closest('[data-action="toggle-language"]')) {
        Helpers.I18n.toggle();
        location.reload();
      }
    });

    /* تحديث وسم الوضع التجريبي عند تغيّر حالة الاتصال */
    window.addEventListener('shopflow:mode-changed', (e) => {
      const box = document.getElementById('sf-demo-chip-box');
      if (box) box.innerHTML = e.detail && e.detail.demo ? this.demoChipHtml() : '';
      if (e.detail && e.detail.demo) {
        Components.toast('تعذر الوصول إلى الـ API — تم التحويل تلقائيًا إلى وضع البيانات التجريبية', 'warning');
      }
    });
  },

  /** Breadcrumb قابل لإعادة الاستخدام */
  renderBreadcrumb(items) {
    const box = document.getElementById('sf-breadcrumb');
    if (!box || !Array.isArray(items)) return;
    box.innerHTML = `
      <nav aria-label="مسار التنقل">
        <ol class="breadcrumb">
          ${items.map((it, i) => {
            const last = i === items.length - 1;
            return last
              ? `<li class="breadcrumb-item active" aria-current="page">${Helpers.escapeHtml(it.title)}</li>`
              : `<li class="breadcrumb-item"><a href="${it.href || '#'}">${Helpers.escapeHtml(it.title)}</a></li>`;
          }).join('')}
        </ol>
      </nav>`;
  },

  /** مزامنة إعدادات المتجر (العملة وغيرها) مرة واحدة كل جلسة */
  async syncSettings() {
    if (sessionStorage.getItem('shopflow_settings_synced') === '1') return;
    sessionStorage.setItem('shopflow_settings_synced', '1');
    try {
      const res = await Api.get('/settings');
      const data = res.data || {};
      Helpers.saveSettings({ ...Helpers.getSettings(), ...data });
      if (data.store_name) {
        Auth.setStore({ name: data.store_name, logo: data.logo || '' });
        const nameEl = document.getElementById('sf-store-name');
        const footerEl = document.getElementById('sf-footer-store');
        if (nameEl) nameEl.textContent = data.store_name;
        if (footerEl) footerEl.textContent = data.store_name;
      }
    } catch { /* الإعدادات غير متاحة — سنستخدم الافتراضية */ }
  },

  /** إخفاء عناصر الواجهة حسب دور المستخدم (التحقق الحقيقي في الـ Back-end) */
  applyRoles(user) {
    document.querySelectorAll('[data-roles]').forEach((el) => {
      const roles = String(el.dataset.roles || '').split(',').map((r) => r.trim()).filter(Boolean);
      if (roles.length && !roles.includes(user.role)) el.remove();
    });
  },

  /* ============================================================
     الإشعارات
     ============================================================ */

  async loadNotifications() {
    const listEl = document.getElementById('sf-notif-list');
    const badge = document.getElementById('sf-notif-badge');
    try {
      const res = await Api.get('/notifications');
      const { items = [], unread = 0 } = res.data || {};
      if (badge) {
        badge.textContent = unread > 9 ? '9+' : String(unread);
        badge.style.display = unread > 0 ? '' : 'none';
      }
      if (listEl) {
        listEl.innerHTML = items.length
          ? items.map((n) => this.notifItemHtml(n)).join('')
          : '<div class="notif-empty"><i class="bi bi-bell-slash d-block mb-2 fs-4"></i>لا توجد إشعارات</div>';
      }
    } catch {
      if (listEl) listEl.innerHTML = '<div class="notif-empty">تعذر جلب الإشعارات</div>';
    }

    const readAllBtn = document.getElementById('sf-notif-readall');
    if (readAllBtn) {
      readAllBtn.onclick = async () => {
        try {
          await Api.post('/notifications/read-all');
          this.loadNotifications();
        } catch (err) {
          this.toast(err.message || 'تعذر تحديث الإشعارات', 'error');
        }
      };
    }
  },

  notifItemHtml(n) {
    const conf = NOTIF_ICONS[n.type] || { icon: 'bi-bell', cls: 'icon-secondary' };
    return `<div class="notif-item ${n.read ? '' : 'unread'}">
      <span class="notif-icon ${conf.cls}"><i class="bi ${conf.icon}"></i></span>
      <div class="flex-grow-1">
        <p class="notif-title">${Helpers.escapeHtml(n.title)}</p>
        <p class="notif-msg">${Helpers.escapeHtml(n.message)}</p>
        <span class="notif-time"><i class="bi bi-clock"></i> ${Helpers.escapeHtml(Helpers.timeAgo(n.date))}</span>
      </div>
    </div>`;
  },

  /* ============================================================
     Toast — إشعارات منبثقة للنجاح والخطأ
     ============================================================ */

  toast(message, type = 'success') {
    let wrap = document.getElementById('sf-toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'sf-toasts';
      wrap.id = 'sf-toasts';
      document.body.appendChild(wrap);
    }

    const icons = {
      success: 'bi-check-circle-fill',
      error: 'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };

    const el = document.createElement('div');
    el.className = `sf-toast toast-${type}`;
    el.innerHTML = `<i class="bi ${icons[type] || icons.info} sf-toast-icon"></i>
      <div class="sf-toast-msg">${Helpers.escapeHtml(message)}</div>`;
    wrap.appendChild(el);

    const dismiss = () => {
      if (el.classList.contains('toast-out')) return;
      el.classList.add('toast-out');
      setTimeout(() => el.remove(), 250);
    };

    el.addEventListener('click', dismiss);
    setTimeout(dismiss, 4000);
  },

  /* ============================================================
     Confirm Modal — تأكيد قبل الحذف أو الإلغاء (يعيد Promise<boolean>)
     ============================================================ */

  confirm({ title = 'تأكيد الإجراء', message = 'هل أنت متأكد من تنفيذ هذا الإجراء؟', confirmText = 'تأكيد', cancelText = 'إلغاء', danger = true } = {}) {
    return new Promise((resolve) => {
      let modalEl = document.getElementById('sf-confirm-modal');
      if (!modalEl) {
        document.body.insertAdjacentHTML('beforeend', `
          <div class="modal fade" id="sf-confirm-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-sm">
              <div class="modal-content">
                <div class="modal-body text-center p-4">
                  <div class="mb-2"><i class="bi bi-exclamation-triangle display-5 ${danger ? 'text-danger' : 'text-warning'}"></i></div>
                  <h6 class="fw-bold mb-1" id="sf-confirm-title"></h6>
                  <p class="text-muted small mb-0" id="sf-confirm-message"></p>
                </div>
                <div class="modal-footer justify-content-center">
                  <button type="button" class="btn btn-soft-secondary" id="sf-confirm-cancel"></button>
                  <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="sf-confirm-ok"></button>
                </div>
              </div>
            </div>
          </div>`);
        modalEl = document.getElementById('sf-confirm-modal');
      }

      document.getElementById('sf-confirm-title').textContent = title;
      document.getElementById('sf-confirm-message').textContent = message;
      const okBtn = document.getElementById('sf-confirm-ok');
      const cancelBtn = document.getElementById('sf-confirm-cancel');
      okBtn.textContent = confirmText;
      okBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
      cancelBtn.textContent = cancelText;

      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      let settled = false;
      const done = (value) => {
        if (settled) return;
        settled = true;
        modal.hide();
        resolve(value);
      };

      okBtn.onclick = () => done(true);
      cancelBtn.onclick = () => done(false);
      modalEl.onhidden = () => done(false);

      modal.show();
    });
  },

  /* ============================================================
     Loader + Skeletons + Empty/Error States
     ============================================================ */

  /** مؤشر تحميل عام فوق الصفحة (يدعم نداءات متداخلة) */
  loader(show) {
    this._loaderCount = Math.max(0, this._loaderCount + (show ? 1 : -1));
    let el = document.getElementById('sf-loader');
    if (!el && show) {
      el = document.createElement('div');
      el.className = 'sf-loader';
      el.id = 'sf-loader';
      el.innerHTML = '<div class="spinner-border"></div><div class="sf-loader-text">جارٍ التحميل...</div>';
      document.body.appendChild(el);
    }
    if (el) el.style.display = this._loaderCount > 0 ? 'flex' : 'none';
  },

  /** صفوف Skeleton لجداول البيانات */
  tableSkeleton(cols, rows = 5) {
    let html = '';
    for (let i = 0; i < rows; i++) {
      html += `<tr>${Array.from({ length: cols }, (_, j) => {
        const width = 55 + ((i * 7 + j * 13) % 4) * 12;
        return `<td><span class="skeleton" style="height:14px;width:${width}%"></span></td>`;
      }).join('')}</tr>`;
    }
    return html;
  },

  /** بطاقات Skeleton للإحصائيات */
  statCardsSkeleton(count = 4) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `<div class="col-6 col-lg-4 col-xl-3"><div class="card stat-card">
        <span class="skeleton" style="width:50px;height:50px;border-radius:14px"></span>
        <span class="w-100">
          <span class="skeleton" style="height:22px;width:70%"></span>
          <span class="skeleton" style="height:12px;width:45%;margin-top:6px"></span>
        </span>
      </div></div>`;
    }
    return html;
  },

  /** حالة عدم وجود بيانات */
  emptyState({ icon = 'bi-inbox', title = 'لا توجد بيانات', message = '', actionHtml = '' } = {}) {
    return `<div class="empty-state">
      <i class="bi ${icon} empty-icon"></i>
      <div class="empty-title">${Helpers.escapeHtml(title)}</div>
      ${message ? `<p class="empty-msg">${Helpers.escapeHtml(message)}</p>` : ''}
      ${actionHtml}
    </div>`;
  },

  /** حالة الخطأ مع زر إعادة المحاولة */
  errorState(message = 'حدث خطأ أثناء تحميل البيانات', retryAction = '') {
    return `<div class="empty-state">
      <i class="bi bi-wifi-off empty-icon" style="color:#FCA5A5"></i>
      <div class="empty-title">تعذر تحميل البيانات</div>
      <p class="empty-msg">${Helpers.escapeHtml(message)}</p>
      ${retryAction ? `<button class="btn btn-primary" data-action="retry-load"><i class="bi bi-arrow-clockwise me-1"></i>إعادة المحاولة</button>` : ''}
    </div>`;
  },

  /* ============================================================
     Pagination — ترقيم صفحات الجداول
     ============================================================ */

  pagination(container, meta, onPage) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    const m = meta || {};
    if (!m.total || m.total <= (m.per_page || 10)) { el.innerHTML = ''; return; }

    const cur = m.current_page || 1;
    const last = m.last_page || 1;

    let pages = [];
    if (last <= 7) {
      pages = Array.from({ length: last }, (_, i) => i + 1);
    } else {
      const around = new Set([1, last, cur - 1, cur, cur + 1].filter((p) => p >= 1 && p <= last));
      pages = [...around].sort((a, b) => a - b);
    }

    let html = `<div class="page-info">عرض ${Helpers.formatNumber(m.from || 0)} - ${Helpers.formatNumber(m.to || 0)} من ${Helpers.formatNumber(m.total)}</div>
      <ul class="pagination">
        <li class="page-item ${cur <= 1 ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${cur - 1}" aria-label="السابق"><i class="bi bi-chevron-right"></i></a>
        </li>
        ${pages.map((p) => {
          const prev = pages[pages.indexOf(p) - 1];
          const gap = prev && p - prev > 1 ? '<li class="page-item disabled"><span class="page-link">…</span></li>' : '';
          return `${gap}<li class="page-item ${p === cur ? 'active' : ''}">
            <a class="page-link" href="#" data-page="${p}">${Helpers.formatNumber(p)}</a></li>`;
        }).join('')}
        <li class="page-item ${cur >= last ? 'disabled' : ''}">
          <a class="page-link" href="#" data-page="${cur + 1}" aria-label="التالي"><i class="bi bi-chevron-left"></i></a>
        </li>
      </ul>`;

    el.innerHTML = html;
    el.onclick = (e) => {
      e.preventDefault();
      const link = e.target.closest('a[data-page]');
      if (!link || link.parentElement.classList.contains('disabled')) return;
      const page = parseInt(link.dataset.page, 10);
      if (page && page !== cur) onPage(page);
    };
  },

  /* ============================================================
     مكونات عرض قابلة لإعادة الاستخدام
     ============================================================ */

  /** بطاقة إحصائية */
  statCard({ icon, label, value, sub = '', color = 'primary', colClass = 'col-6 col-lg-4 col-xl-3', href = '' }) {
    const card = `<div class="card stat-card">
      <span class="stat-icon icon-${color}"><i class="bi ${icon}"></i></span>
      <span class="min-w-0">
        <span class="stat-value">${value}</span>
        <span class="stat-label d-block">${Helpers.escapeHtml(label)}</span>
        ${sub ? `<span class="stat-sub d-block">${sub}</span>` : ''}
      </span>
    </div>`;
    if (href) {
      return `<div class="${colClass}"><a class="d-block text-reset stat-card-link" href="${href}">${card}</a></div>`;
    }
    return `<div class="${colClass}">${card}</div>`;
  },

  /** صورة منتج مصغرة أو بديل أيقونة */
  productThumb(product, cls = '') {
    if (product && product.image) {
      return `<span class="cell-thumb ${cls}"><img src="${Helpers.escapeHtml(product.image)}" alt="${Helpers.escapeHtml(product.name || '')}" loading="lazy"></span>`;
    }
    return `<span class="cell-thumb ${cls}"><i class="bi bi-image"></i></span>`;
  },

  /** صورة المستخدم الرمزية (الأحرف الأولى) */
  avatar(name, size = '') {
    return `<span class="sf-avatar ${size}">${Helpers.escapeHtml(Helpers.getInitials(name))}</span>`;
  },

  /** شارة حالة الفاتورة */
  saleStatusBadge(status) {
    const conf = Helpers.saleStatus(status);
    return `<span class="badge ${conf.class}"><i class="bi ${conf.icon} me-1"></i>${conf.label}</span>`;
  },

  /** شارة حالة المخزون */
  stockBadge(product) {
    const conf = Helpers.stockStatus(product);
    return `<span class="badge ${conf.class}">${conf.label}</span>`;
  },

  /* ============================================================
     الطباعة
     ============================================================ */

  /** طباعة عنصر محدد فقط (الفواتير والتقارير) */
  printSection(target) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    el.classList.add('print-target');
    document.body.classList.add('sf-printing');

    const cleanup = () => {
      el.classList.remove('print-target');
      document.body.classList.remove('sf-printing');
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 800);
    }, 60);
  },

  /* ============================================================
     المتجر الإلكتروني — هيكل عام لصفحات الزبائن
     ============================================================ */

  initStorePage({ active = '', withSearch = false } = {}) {
    const settings = Helpers.getSettings();
    const user = Auth.getUser();
    const storeName = (user && user.store && user.store.name) || settings.store_name || 'متجر ShopFlow';
    const esc = (v) => Helpers.escapeHtml(v);

    const shell = document.getElementById('store-shell');
    if (!shell) return;

    shell.insertAdjacentHTML('afterbegin', `
      <header class="store-header">
        <div class="container-xl d-flex align-items-center gap-3 py-2 flex-wrap">
          <a class="store-brand" href="store.html">
            <img src="assets/images/logo.svg" alt="شعار ${esc(storeName)}">
            <span class="store-name">${esc(storeName)}</span>
          </a>
          ${withSearch ? `
            <div class="store-search input-group">
              <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
              <input type="text" class="form-control" id="store-search-input" placeholder="ابحث عن منتج...">
            </div>` : ''}
          <div class="ms-auto d-flex align-items-center gap-2">
            <button class="lang-switcher" type="button" data-action="toggle-language" title="تغيير اللغة">
              <i class="bi bi-translate"></i><span>${Helpers.I18n.lang === 'ar' ? 'EN' : 'عربي'}</span>
            </button>
            ${Auth.isLoggedIn() ? '<a class="btn btn-soft-secondary" href="dashboard.html"><i class="bi bi-speedometer2 me-1"></i>لوحة التحكم</a>' : ''}
            <a class="btn btn-primary cart-btn" href="cart.html" aria-label="سلة المشتريات">
              <i class="bi bi-cart3"></i><span class="d-none d-sm-inline"> السلة</span>
              <span class="icon-badge" id="sf-cart-badge" style="display:none">0</span>
            </a>
          </div>
        </div>
      </header>
    `);

    shell.insertAdjacentHTML('beforeend', `
      <footer class="store-footer">
        © 2026 ${esc(storeName)} · يعمل بنظام ShopFlow لإدارة المحلات
      </footer>
    `);
    document.querySelector('.standalone-lang-switcher')?.remove();
    Helpers.I18n.translate(shell);
  },

  /** تحديث رقم السلة في الترويسة */
  updateCartBadge(count) {
    const badge = document.getElementById('sf-cart-badge');
    if (!badge) return;
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.style.display = count > 0 ? '' : 'none';
  }
};

window.Components = Components;
