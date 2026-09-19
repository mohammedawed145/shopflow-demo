'use strict';

/* ============================================================
   ShopFlow — صفحة الإعدادات (settings.html)
   معلومات المتجر + تغيير كلمة المرور + إعدادات الاتصال بالـ API
   ============================================================ */

const Settings = {

  init() {
    Components.initAppPage({
      active: 'settings',
      breadcrumb: [{ label: 'لوحة التحكم', href: 'dashboard.html' }, { label: 'الإعدادات' }],
      pageTitle: 'إعدادات المتجر'
    });

    this.fillApiFields();
    this.toggleDemoCard();
    this.loadSettings();
    this.bindEvents();
  },

  /* ---------- تحميل الإعدادات الحالية من الخادم ---------- */
  async loadSettings() {
    Components.loader(true);
    try {
      const res = await Api.get('/settings');
      const d = res.data || {};
      document.getElementById('settings-name').value = d.store_name || '';
      document.getElementById('settings-type').value = d.business_type || 'إلكترونيات';
      document.getElementById('settings-phone').value = d.store_phone || '';
      document.getElementById('settings-email').value = d.store_email || '';
      document.getElementById('settings-address').value = d.store_address || '';
      document.getElementById('settings-currency').value = d.currency || 'ر.س';
      document.getElementById('settings-tax').value = d.tax_rate ?? 15;
      document.getElementById('settings-logo').value = d.logo || '';
      this.setLogoPreview(d.logo || '');
    } catch (err) {
      Components.toast(err.message || 'تعذر جلب الإعدادات', 'error');
    } finally {
      Components.loader(false);
    }
  },

  /* ---------- حفظ معلومات المتجر ---------- */
  async submitSettings(e) {
    e.preventDefault();
    const form = e.target;
    if (!Helpers.validateForm(form)) return;

    const btn = document.getElementById('settings-save');
    setBtnLoading(btn, true);

    try {
      const body = {
        store_name: document.getElementById('settings-name').value.trim(),
        business_type: document.getElementById('settings-type').value,
        store_phone: document.getElementById('settings-phone').value.trim(),
        store_email: document.getElementById('settings-email').value.trim(),
        store_address: document.getElementById('settings-address').value.trim(),
        currency: document.getElementById('settings-currency').value,
        tax_rate: Number(document.getElementById('settings-tax').value) || 0,
        logo: document.getElementById('settings-logo').value.trim()
      };

      await Api.put('/settings', body);

      // تحديث الإعدادات المحلية والهيكل فورًا (الاسم والعملة في كل الصفحات)
      Helpers.saveSettings({ ...Helpers.getSettings(), ...body });
      Auth.setStore({ name: body.store_name, logo: body.logo });
      const nameEl = document.getElementById('sf-store-name');
      if (nameEl) nameEl.textContent = body.store_name;
      const footerEl = document.getElementById('sf-footer-store');
      if (footerEl) footerEl.textContent = body.store_name;
      sessionStorage.setItem('shopflow_settings_synced', '1');

      Components.toast('تم حفظ إعدادات المتجر بنجاح', 'success');
    } catch (err) {
      Components.toast(err.message || 'تعذر حفظ الإعدادات', 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  },

  /* ---------- تغيير كلمة المرور ---------- */
  async submitPassword(e) {
    e.preventDefault();
    const form = e.target;
    if (!Helpers.validateForm(form)) return;

    const btn = document.getElementById('password-save');
    setBtnLoading(btn, true);

    try {
      await Auth.changePassword(
        document.getElementById('current-password').value,
        document.getElementById('new-password').value
      );
      form.reset();
      Components.toast('تم تغيير كلمة المرور بنجاح', 'success');
    } catch (err) {
      Components.toast(err.message || 'تعذر تغيير كلمة المرور', 'error');
    } finally {
      setBtnLoading(btn, false);
    }
  },

  /* ---------- شعار المتجر: معاينة / رفع / إزالة ---------- */
  setLogoPreview(src) {
    const preview = document.getElementById('settings-logo-preview');
    if (src) {
      preview.innerHTML = `<img src="${Helpers.escapeHtml(src)}" alt="شعار المتجر">`;
    } else {
      preview.innerHTML = '<i class="bi bi-shop" style="font-size:2rem"></i>';
    }
  },

  bindLogoEvents() {
    document.getElementById('settings-logo').addEventListener('input', (e) => {
      this.setLogoPreview(e.target.value.trim());
    });
    document.getElementById('settings-logo-upload').addEventListener('click', () => {
      document.getElementById('settings-logo-file').click();
    });
    document.getElementById('settings-logo-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await Helpers.readImageFile(file);
        document.getElementById('settings-logo').value = dataUrl;
        this.setLogoPreview(dataUrl);
      } catch (err) {
        Components.toast(err.message, 'error');
      }
      e.target.value = '';
    });
    document.getElementById('settings-logo-remove').addEventListener('click', () => {
      document.getElementById('settings-logo').value = '';
      this.setLogoPreview('');
    });
  },

  /* ---------- إعدادات الاتصال بالـ API ---------- */
  fillApiFields() {
    document.getElementById('api-base').value = Api.base;
    document.getElementById('api-mode').value = Api.mode();
  },

  async testConnection() {
    const status = document.getElementById('api-status');
    const btn = document.getElementById('api-test');
    const url = document.getElementById('api-base').value.trim();

    // يُطبَّق العنوان مؤقتًا لاختباره ثم يعود كما كان
    const prev = localStorage.getItem('shopflow_api_base');
    localStorage.setItem('shopflow_api_base', url);
    setBtnLoading(btn, true, 'جارٍ الاختبار...');
    status.innerHTML = '<span class="text-secondary"><span class="spinner-border spinner-border-sm me-1"></span>جارٍ فحص الخادم...</span>';

    const ok = await Api.probe();
    setBtnLoading(btn, false);

    if (prev === null) localStorage.removeItem('shopflow_api_base');
    else localStorage.setItem('shopflow_api_base', prev);

    if (ok) {
      status.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i>تم الاتصال بالخادم بنجاح (${Helpers.escapeHtml(url)})`;
      Components.toast('تم الاتصال بالـ Back-end بنجاح', 'success');
    } else {
      status.innerHTML = `<i class="bi bi-x-circle-fill text-danger me-1"></i>تعذر الاتصال بالخادم — تأكد من تشغيله ومن صحة العنوان`;
      Components.toast('فشل الاتصال بالخادم', 'error');
    }
  },

  saveApiSettings() {
    const url = document.getElementById('api-base').value.trim();
    const mode = document.getElementById('api-mode').value;

    if (url) localStorage.setItem('shopflow_api_base', url);
    else localStorage.removeItem('shopflow_api_base');
    Api.setMode(mode);
    sessionStorage.removeItem('shopflow_settings_synced');

    Components.toast('تم حفظ إعدادات الاتصال، جارٍ إعادة التحميل...', 'success');
    setTimeout(() => location.reload(), 900);
  },

  /* ---------- إعادة تعيين البيانات التجريبية ---------- */
  async resetDemoData() {
    const confirmed = await Components.confirm({
      title: 'إعادة تعيين البيانات التجريبية',
      message: 'سيتم حذف كل التعديلات التي أجريتها على البيانات التجريبية (منتجات، فواتير، عملاء...) وإرجاعها لحالتها الأولى. هل أنت متأكد؟',
      confirmText: 'نعم، إعادة التعيين',
      cancelText: 'إلغاء',
      danger: true
    });
    if (!confirmed) return;

    try {
      DemoData.reset();
      Components.toast('تمت إعادة تعيين البيانات التجريبية', 'success');
      setTimeout(() => location.reload(), 900);
    } catch (err) {
      Components.toast('تعذرت إعادة التعيين', 'error');
    }
  },

  toggleDemoCard() {
    const card = document.getElementById('demo-card');
    if (card && Api.isDemo()) card.classList.remove('d-none');
  },

  bindEvents() {
    document.getElementById('settings-form').addEventListener('submit', (e) => this.submitSettings(e));
    document.getElementById('password-form').addEventListener('submit', (e) => this.submitPassword(e));
    this.bindLogoEvents();

    document.getElementById('api-test').addEventListener('click', () => this.testConnection());
    document.getElementById('api-save').addEventListener('click', () => this.saveApiSettings());
    document.getElementById('demo-reset').addEventListener('click', () => this.resetDemoData());

    bindPasswordToggles();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.body.dataset.page === 'settings') Settings.init();
});
