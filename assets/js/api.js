'use strict';

/* ============================================================
   ShopFlow — طبقة الاتصال بالـ Back-end (REST API / Fetch)
   ------------------------------------------------------------
   لتغيير عنوان الـ API: عدّل القيمة الافتراضية أدناه، أو من
   صفحة settings.html، أو عبر localStorage بمفتاح shopflow_api_base
   ============================================================ */

const API_DEFAULT_BASE = '../shopflow-backend/public/api'; // عنوان الـ Back-end الافتراضي من مجلد الواجهة

/* أسماء توافقية مطلوبة في مواصفات المشروع؛ القيمة قابلة للتغيير من الإعدادات. */
const API_BASE_URL = API_DEFAULT_BASE;

class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/* رسائل أخطاء HTTP بالعربية */
const HTTP_MESSAGES = {
  400: 'الطلب غير صالح',
  401: 'انتهت الجلسة، يرجى تسجيل الدخول من جديد',
  403: 'ليست لديك صلاحية للقيام بهذا الإجراء',
  404: 'العنصر المطلوب غير موجود',
  422: 'البيانات المدخلة غير صحيحة',
  429: 'عدد كبير من المحاولات، يرجى المحاولة بعد قليل',
  500: 'حدث خطأ في الخادم، يرجى المحاولة مرة أخرى',
  503: 'الخدمة غير متاحة حاليًا'
};

const Api = {

  /** عنوان الـ API الحالي (قابل للتغيير من صفحة الإعدادات) */
  get base() {
    return (localStorage.getItem('shopflow_api_base') || API_DEFAULT_BASE).replace(/\/+$/, '');
  },

  /* ---------- إدارة وضع التشغيل (api | demo) ---------- */

  /** الوضع المختار: auto (افتراضي) / live / demo */
  mode() {
    return localStorage.getItem('shopflow_api_mode') || 'auto';
  },

  setMode(mode) {
    localStorage.setItem('shopflow_api_mode', mode);
    sessionStorage.removeItem('shopflow_probe_result');
    this._applyDemo(mode === 'demo');
  },

  /** هل نعمل حاليًا بالبيانات التجريبية؟ */
  isDemo() {
    return localStorage.getItem('shopflow_demo_active') === '1';
  },

  /** يحدد وضع العمل تلقائيًا في الوضع auto عبر فحص /health */
  async ensureMode() {
    const mode = this.mode();
    if (mode === 'demo') { this._applyDemo(true); return; }
    if (mode === 'live') { this._applyDemo(false); return; }

    let result = sessionStorage.getItem('shopflow_probe_result');
    if (!result) {
      result = (await this.probe()) ? 'live' : 'demo';
      sessionStorage.setItem('shopflow_probe_result', result);
    }
    this._applyDemo(result === 'demo');
  },

  /** فحص جاهزية الـ Back-end عبر نقطة /health */
  async probe() {
    try {
      const res = await this._fetch(this.base + '/health', { method: 'GET' }, 6000);
      if (!res.ok) return false;
      const json = await res.json().catch(() => null);
      return !!(json && json.success !== false);
    } catch {
      return false;
    }
  },

  _applyDemo(active) {
    const was = this.isDemo();
    if (active) localStorage.setItem('shopflow_demo_active', '1');
    else localStorage.removeItem('shopflow_demo_active');
    if (was !== active) {
      window.dispatchEvent(new CustomEvent('shopflow:mode-changed', { detail: { demo: active } }));
    }
  },

  /* ---------- الطلب الأساسي ---------- */

  /**
   * تنفيذ طلب HTTP موحد.
   * @param {string} path مسار الـ endpoint مثل /api/products
   * @param {object} opts { method, body, params, auth, redirectOn401, timeout }
   * @returns {Promise<{success, message, data, meta}>}
   */
  async request(path, { method = 'GET', body = null, params = null, auth = true, redirectOn401 = true, timeout = 20000 } = {}) {
    await this.ensureMode();

    /* الوضع التجريبي: تُخدم الطلبات من DemoAPI */
    if (this.isDemo()) {
      try {
        const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
        return await DemoAPI.handle(method, path, { body: body || {}, params: params || {}, token });
      } catch (err) {
        if (err && err.demo) {
          if (err.status === 401 && redirectOn401 && typeof Auth !== 'undefined') {
            Auth.handleSessionExpired();
          }
          throw new ApiError(err.message, err.status);
        }
        throw err;
      }
    }

    const url = this.buildUrl(path, params);
    const headers = { Accept: 'application/json' };
    if (body !== null) headers['Content-Type'] = 'application/json';

    const token = (typeof Auth !== 'undefined') ? Auth.getToken() : null;
    if (token && auth) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      res = await this._fetch(url, {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : undefined
      }, timeout);
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new ApiError('انتهت مهلة الاتصال بالخادم، يرجى المحاولة مرة أخرى', 0);
      }
      throw new ApiError('تعذر الاتصال بالخادم، تحقق من تشغيل الـ Back-end ومن صحة عنوان الـ API', 0);
    }

    /* انتهاء صلاحية الجلسة: إعادة المستخدم إلى صفحة الدخول */
    if (res.status === 401 && auth && redirectOn401) {
      if (typeof Auth !== 'undefined') Auth.handleSessionExpired();
      throw new ApiError(HTTP_MESSAGES[401], 401);
    }

    let json = null;
    try { json = await res.json(); } catch { json = null; }

    if (!res.ok || !json || json.success === false) {
      const message = (json && json.message) || HTTP_MESSAGES[res.status] || `حدث خطأ غير متوقع (${res.status})`;
      throw new ApiError(message, res.status);
    }

    return json;
  },

  /** بناء العنوان الكامل مع معاملات الاستعلام */
  buildUrl(path, params) {
    const clean = path.startsWith('/') ? path : `/${path}`;
    let url = this.base + clean;
    if (params) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') qs.append(k, v);
      });
      const q = qs.toString();
      if (q) url += (url.includes('?') ? '&' : '?') + q;
    }
    return url;
  },

  /** fetch مع مهلة زمنية عبر AbortController */
  _fetch(url, options, timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  },

  /* ---------- دوال مختصرة ---------- */

  get(path, params, opts = {}) {
    return this.request(path, { ...opts, method: 'GET', params });
  },

  post(path, body, opts = {}) {
    return this.request(path, { ...opts, method: 'POST', body });
  },

  put(path, body, opts = {}) {
    return this.request(path, { ...opts, method: 'PUT', body });
  },

  del(path, opts = {}) {
    return this.request(path, { ...opts, method: 'DELETE' });
  }
};

window.Api = Api;
window.ApiError = ApiError;
/* واجهة بسيطة متوافقة مع الاستخدام المباشر: apiRequest('/products', options) */
window.API_BASE_URL = API_BASE_URL;
window.apiRequest = (path, options = {}) => Api.request(path, options);
