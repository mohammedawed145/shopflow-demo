'use strict';

/* ============================================================
   ShopFlow — إدارة المصادقة والجلسات
   Token يُحفظ في localStorage عند "تذكرني" وإلا في sessionStorage
   ============================================================ */

const Auth = {
  TOKEN_KEY: 'shopflow_token',
  USER_KEY: 'shopflow_user',

  /** حفظ الجلسة: تذكرني → localStorage، وإلا sessionStorage */
  saveSession(token, user, remember) {
    const storage = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    other.removeItem(this.TOKEN_KEY);
    other.removeItem(this.USER_KEY);
    storage.setItem(this.TOKEN_KEY, token);
    storage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  getToken() {
    return sessionStorage.getItem(this.TOKEN_KEY) || localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    try {
      const raw = sessionStorage.getItem(this.USER_KEY) || localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!(this.getToken() && this.getUser());
  },

  /** تحديث بيانات المتجر داخل بيانات المستخدم المحفوظة */
  setStore(store) {
    const user = this.getUser();
    if (!user) return;
    user.store = { ...(user.store || {}), ...store };
    const raw = JSON.stringify(user);
    if (localStorage.getItem(this.USER_KEY)) localStorage.setItem(this.USER_KEY, raw);
    else sessionStorage.setItem(this.USER_KEY, raw);
  },

  clearSession() {
    [localStorage, sessionStorage].forEach((s) => {
      s.removeItem(this.TOKEN_KEY);
      s.removeItem(this.USER_KEY);
    });
  },

  logout(message) {
    this.clearSession();
    location.replace(`login.html${message ? `?msg=${message}` : ''}`);
  },

  /** حماية صفحات التطبيق: يعيد المستخدم أو يحوله إلى login.html */
  requireAuth() {
    if (this.isLoggedIn()) return this.getUser();
    const page = location.pathname.split('/').pop() || 'dashboard.html';
    location.replace(`login.html?redirect=${encodeURIComponent(page)}`);
    return null;
  },

  /** التعامل مع 401: إنهاء الجلسة والعودة لتسجيل الدخول */
  handleSessionExpired() {
    if (this.isAuthPage()) return;
    this.clearSession();
    location.replace('login.html?expired=1');
  },

  isAuthPage() {
    return ['login.html', 'register.html', 'forgot-password.html', 'index.html']
      .includes(location.pathname.split('/').pop());
  },

  /* ---------- عمليات المصادقة عبر الـ API ---------- */

  async login(identifier, password, remember) {
    const res = await Api.post('/auth/login', { identifier, password }, { auth: false, redirectOn401: false });
    const { token, user } = res.data || {};
    if (!token || !user) throw new ApiError('استجابة تسجيل الدخول غير صالحة من الخادم');
    this.saveSession(token, user, !!remember);
    return user;
  },

  async register(payload) {
    return Api.post('/auth/register', payload, { auth: false, redirectOn401: false });
  },

  async forgotPassword(email) {
    return Api.post('/auth/forgot-password', { email }, { auth: false, redirectOn401: false });
  },

  async changePassword(currentPassword, newPassword) {
    const user = this.getUser() || {};
    return Api.post('/auth/change-password', {
      user_id: user.id,
      current_password: currentPassword,
      new_password: newPassword
    });
  }
};

/* ============================================================
   تسيير صفحات المصادقة تلقائيًا حسب data-page
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  if (page === 'login') initLoginPage();
  else if (page === 'register') initRegisterPage();
  else if (page === 'forgot-password') initForgotPage();
  else if (page === 'index') {
    location.replace(Auth.isLoggedIn() ? 'dashboard.html' : 'login.html');
  }
});

/* ---------- صفحة تسجيل الدخول ---------- */

async function initLoginPage() {
  await Api.ensureMode();
  bindPasswordToggles();

  const form = document.getElementById('login-form');
  const submitBtn = document.getElementById('login-submit');
  const demoHint = document.getElementById('demo-hint');

  /* إظهار بيانات الدخول التجريبية فقط عند التشغيل بالبيانات التجريبية */
  if (demoHint) demoHint.classList.toggle('d-none', !Api.isDemo());

  /* رسائل الحالة القادمة من صفحات أخرى */
  const q = new URLSearchParams(location.search);
  if (q.get('expired')) Components.toast('انتهت الجلسة، يرجى تسجيل الدخول من جديد', 'warning');
  if (q.get('msg') === 'logout') Components.toast('تم تسجيل الخروج بنجاح', 'info');
  if (q.get('registered')) Components.toast('تم إنشاء الحساب بنجاح، سجّل الدخول الآن', 'success');

  const fillDemo = document.getElementById('fill-demo');
  if (fillDemo) {
    fillDemo.addEventListener('click', () => {
      document.getElementById('login-identifier').value = 'demo@shopflow.com';
      document.getElementById('login-password').value = '123456';
      Components.toast('تمت تعبئة بيانات الدخول التجريبية', 'info');
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { valid, data } = Helpers.validateForm(form);
    if (!valid) return;

    setBtnLoading(submitBtn, true, 'جارٍ تسجيل الدخول...');

    try {
      const remember = document.getElementById('login-remember').checked;
      await Auth.login(data.identifier, data.password, remember);
      Components.toast('تم تسجيل الدخول بنجاح، جارٍ التحويل...', 'success');

      /* التحويل للصفحة المطلوبة بشكل آمن (صفحات التطبيق فقط) */
      const redirect = new URLSearchParams(location.search).get('redirect');
      const target = redirect && /^[a-z-]+\.html$/i.test(redirect) ? redirect : 'dashboard.html';
      setTimeout(() => location.replace(target), 700);
    } catch (err) {
      Components.toast(err.message || 'فشل تسجيل الدخول، تحقق من البيانات', 'error');
      setBtnLoading(submitBtn, false);
    }
  });
}

/* ---------- صفحة إنشاء الحساب ---------- */

async function initRegisterPage() {
  await Api.ensureMode();
  bindPasswordToggles();

  const form = document.getElementById('register-form');
  const submitBtn = document.getElementById('register-submit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { valid, data } = Helpers.validateForm(form);
    if (!valid) return;

    setBtnLoading(submitBtn, true, 'جارٍ إنشاء الحساب...');

    try {
      await Auth.register({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        store_name: data.store_name,
        business_type: data.business_type,
        address: data.address
      });
      Components.toast('تم إنشاء الحساب بنجاح، جارٍ التحويل لصفحة الدخول...', 'success');
      setTimeout(() => location.replace('login.html?registered=1'), 1000);
    } catch (err) {
      Components.toast(err.message || 'تعذر إنشاء الحساب، تحقق من البيانات', 'error');
      setBtnLoading(submitBtn, false);
    }
  });
}

/* ---------- صفحة نسيت كلمة المرور ---------- */

async function initForgotPage() {
  await Api.ensureMode();

  const form = document.getElementById('forgot-form');
  const submitBtn = document.getElementById('forgot-submit');
  const successBox = document.getElementById('forgot-success');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { valid, data } = Helpers.validateForm(form);
    if (!valid) return;

    setBtnLoading(submitBtn, true, 'جارٍ الإرسال...');

    try {
      await Auth.forgotPassword(data.email);
      form.classList.add('d-none');
      successBox.classList.remove('d-none');
    } catch (err) {
      Components.toast(err.message || 'تعذر إرسال الطلب، حاول مرة أخرى', 'error');
      setBtnLoading(submitBtn, false);
    }
  });
}

/* ---------- أدوات مساعدة للصفحات ---------- */

/** تشغيل/إيقاف حالة التحميل على زر */
function setBtnLoading(btn, loading, loadingText) {
  if (!btn) return;
  if (loading) {
    btn.dataset.original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${loadingText || 'جارٍ التنفيذ...'}`;
  } else {
    btn.disabled = false;
    if (btn.dataset.original) btn.innerHTML = btn.dataset.original;
  }
}

/** أزرار إظهار/إخفاء كلمة المرور */
function bindPasswordToggles() {
  document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePassword);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    });
  });
}

window.Auth = Auth;
window.setBtnLoading = setBtnLoading;
window.bindPasswordToggles = bindPasswordToggles;
