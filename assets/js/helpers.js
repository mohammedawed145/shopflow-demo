'use strict';

/* ============================================================
   ShopFlow — دوال مساعدة عامة (تنسيق، تحقق، أدوات)
   ============================================================ */

const Helpers = {

  /* ============================================================
     نظام اللغتين: العربية والإنجليزية مع RTL/LTR
     ============================================================ */
  I18n: {
    key: 'shopflow_language',
    lang: localStorage.getItem('shopflow_language') || 'en',
    dict: {
      'العربية': 'English', 'الإنجليزية': 'العربية', 'لوحة التحكم': 'Dashboard',
      'المنتجات': 'Products', 'التصنيفات': 'Categories', 'العملاء': 'Customers',
      'الموردون': 'Suppliers', 'المبيعات والفواتير': 'Sales & Invoices', 'المشتريات': 'Purchases',
      'المصروفات': 'Expenses', 'التقارير': 'Reports', 'إعدادات المتجر': 'Store Settings',
      'المتجر الإلكتروني': 'Online Store', 'تسجيل الخروج': 'Log out', 'الإشعارات': 'Notifications',
      'تحديد الكل كمقروء': 'Mark all as read', 'السلة': 'Cart', 'بحث': 'Search',
      'إضافة منتج': 'Add Product', 'إضافة عميل': 'Add Customer', 'فاتورة جديدة': 'New Invoice',
      'تسجيل الدخول': 'Log in', 'إنشاء حساب جديد': 'Create an account', 'نسيت كلمة المرور؟': 'Forgot password?',
      'إنشاء حساب': 'Create account', 'حفظ': 'Save', 'إلغاء': 'Cancel', 'حذف': 'Delete',
      'تعديل': 'Edit', 'إضافة': 'Add', 'الاسم': 'Name', 'البريد الإلكتروني': 'Email',
      'رقم الهاتف': 'Phone number', 'كلمة المرور': 'Password', 'تأكيد كلمة المرور': 'Confirm password',
      'اسم المتجر': 'Store name', 'العنوان': 'Address', 'الوصف': 'Description',
      'السعر': 'Price', 'الكمية': 'Quantity', 'الإجمالي': 'Total', 'المدفوع': 'Paid',
      'المتبقي': 'Remaining', 'التاريخ': 'Date', 'الحالة': 'Status', 'طريقة الدفع': 'Payment method',
      'إضافة للسلة': 'Add to cart', 'أضف': 'Add', 'متابعة التسوق': 'Continue shopping',
      'إتمام الطلب': 'Checkout', 'تأكيد الطلب': 'Confirm order', 'طباعة / PDF': 'Print / PDF',
      'لا توجد بيانات': 'No data available', 'لا توجد منتجات': 'No products found',
      'تحديث': 'Refresh', 'بحث عن منتج...': 'Search for a product...', 'ابحث عن منتج...': 'Search for a product...',
      'نظام إدارة المحلات': 'Store Management System', 'منتجات، عملاء، مبيعات، ومخزون في مكان واحد': 'Products, customers, sales, and inventory in one place',
      'نظرة عامة على أداء متجرك': 'Overview of your store performance', 'منتجات منخفضة المخزون': 'Low-stock products', 'آخر الفواتير': 'Recent invoices',
      'إجمالي': 'Total', 'مبيعات اليوم': "Today's sales", 'مبيعات الشهر': "This month's sales", 'صافي الأرباح هذا الشهر': "Net profit this month",
      'عدد المنتجات': 'Products count', 'ديون العملاء (لك)': 'Customer receivables', 'ديون الموردين (عليك)': 'Supplier payables',
      'كل التصنيفات': 'All categories', 'كل حالات المخزون': 'All stock statuses', 'متوفر': 'In stock', 'منخفض': 'Low stock', 'نفد المخزون': 'Out of stock',
      'رقم الفاتورة': 'Invoice number', 'العميل': 'Customer', 'سعر الشراء': 'Cost price', 'سعر البيع': 'Selling price',
      'إجراءات': 'Actions', 'مبيعات آخر 14 يومًا': 'Sales in the last 14 days', 'تطبيق الفلاتر': 'Apply filters',
      'تصدير CSV (Excel)': 'Export CSV (Excel)', 'المبيعات': 'Sales', 'الأرباح': 'Profit', 'المخزون': 'Inventory',
      'الأكثر مبيعًا': 'Best sellers', 'الديون': 'Debts', 'المصروفات': 'Expenses', 'تسجيل الدخول بنجاح، جارٍ التحويل...': 'Login successful, redirecting...',
      'وضع البيانات التجريبية مفعّل': 'Demo mode is enabled', 'تعبئة تلقائية': 'Fill demo credentials', 'زيارة المتجر الإلكتروني': 'Visit online store',
      'أدخل بياناتك للوصول إلى لوحة تحكم متجرك': 'Enter your credentials to access your store dashboard', 'دخول': 'Log in', 'تذكرني': 'Remember me',
      'إدارة منتجات المتجر والمخزون والأسعار': 'Manage store products, inventory, and prices', 'إضافة منتج': 'Add product', 'إضافة عميل': 'Add customer',
      'البريد الإلكتروني أو رقم الهاتف': 'Email or phone number', 'كلمة المرور': 'Password', 'شعار ShopFlow': 'ShopFlow logo',
      'نظام إدارة المحلات — منتجات، عملاء، مبيعات، ومخزون في مكان واحد': 'Store management — products, customers, sales, and inventory in one place',
      'الـ API غير متاح حاليًا': 'API is currently unavailable', 'بيانات الدخول': 'Login credentials', 'ليس لديك حساب؟': "Don't have an account?",
      'تمت تعبئة بيانات الدخول التجريبية': 'Demo credentials filled', 'جارٍ تسجيل الدخول...': 'Logging in...', 'جارٍ التحويل...': 'Redirecting...',
      'متجر الأفق': 'Horizon Store', 'صاحب المحل': 'Store owner', 'المتجر': 'Store', 'المستخدم': 'User',
      'إلكترونيات': 'Electronics', 'ملابس وأحذية': 'Clothing & Shoes', 'مواد غذائية': 'Groceries', 'أدوات منزلية': 'Homeware', 'مستلزمات مكتبية': 'Office Supplies',
      'أجهزة وملحقات إلكترونية': 'Devices and electronic accessories', 'أزياء رجالية ونسائية': 'Men and women fashion', 'سلع غذائية أساسية': 'Everyday grocery essentials', 'أدوات ومستلزمات المنزل': 'Home tools and essentials', 'قرطاسية ومستلزمات المكاتب': 'Stationery and office essentials',
      'شاحن سريع 20 واط': '20W Fast Charger', 'سماعة بلوتوث Pro': 'Bluetooth Headphones Pro', 'ماوس لاسلكي': 'Wireless Mouse', 'لوحة مفاتيح ميكانيكية': 'Mechanical Keyboard', 'قميص قطن رجالي': 'Men’s Cotton Shirt', 'بنطال جينز كلاسيك': 'Classic Denim Jeans', 'حذاء رياضي جري': 'Running Sneakers', 'حقيبة ظهر مقاومة للماء': 'Waterproof Backpack', 'كوب حراري ستانلس': 'Stainless Thermal Mug', 'طقم أواني تيفال 5 قطع': '5-Piece Non-stick Cookware Set', 'زيت زيتون بكر 1 لتر': 'Extra Virgin Olive Oil 1L', 'عسل جبلي طبيعي': 'Natural Mountain Honey', 'دفتر ملاحظات جلد': 'Leather Notebook',
      'شاحن Type-C بقوة 20 واط مع كابل مضفر': '20W Type-C charger with braided cable', 'سماعة لاسلكية بعزل ضوضاء نشط': 'Wireless headphones with active noise cancellation', 'ماوس صامت بثلاث سرعات وDPI عالي': 'Silent mouse with three speeds and high DPI', 'لوحة مفاتيح ميكانيكية بإضاءة RGB': 'Mechanical keyboard with RGB lighting', 'قميص قطن صيفي بقصة عصرية': 'Lightweight cotton shirt with a modern cut', 'بنطال جينز بقصة مستقيمة': 'Straight-fit denim jeans', 'حذاء رياضي خفيف مخصص للجري': 'Lightweight running shoes', 'حقيبة ظهر بجيب مخصص للابتوب': 'Backpack with a dedicated laptop sleeve', 'كوب يحافظ على الحرارة 8 ساعات': 'Mug that keeps drinks hot for 8 hours', 'طقم قدور تيفال بطبقة مانعة للالتصاق': 'Non-stick cookware set', 'زيت زيتون بكر ممتاز معصور على البارد': 'Premium cold-pressed extra virgin olive oil', 'عسل جبلي طبيعي 100% بدون إضافات': '100% natural mountain honey with no additives', 'دفتر جلد بغلاف مطبوع و192 صفحة': 'Leather notebook with printed cover and 192 pages',
      'أحمد محمد السالم': 'Ahmed Al-Salem', 'فاطمة علي': 'Fatima Ali', 'محمد السيد': 'Mohamed El-Sayed', 'سارة خالد': 'Sarah Khaled', 'خالد عبدالله': 'Khaled Abdullah', 'نور الهدى حسن': 'Noor Al-Huda Hassan', 'محمود حسن': 'Mahmoud Hassan', 'ليلى إبراهيم': 'Laila Ibrahim', 'عميل نقدي': 'Cash customer',
      'شركة النور للتوريدات': 'Al Noor Supplies Co.', 'مؤسسة الأفق التجارية': 'Horizon Trading Est.', 'شركة البركة للإلكترونيات': 'Al Baraka Electronics Co.', 'مكتبة المستقبل للتوريد': 'Future Library Supplies',
      'مخزون منخفض': 'Low stock', 'نفاد مخزون': 'Out of stock', 'فاتورة جديدة': 'New invoice', 'دفعة مستلمة': 'Payment received', 'عميل دائم': 'Regular customer', 'يفضل الدفع نقدًا': 'Prefers cash payment', 'قبل قليل': 'Just now', 'دقيقة': 'minute', 'دقائق': 'minutes', 'ساعة': 'hour', 'ساعات': 'hours', 'يوم': 'day', 'أيام': 'days',
      'تذكرني': 'Remember me', 'التالي': 'Next', 'السابق': 'Previous', 'تأكيد': 'Confirm', 'تأكيد الإجراء': 'Confirm action', 'إلغاء': 'Cancel', 'عربي': 'Arabic', 'مدير': 'Admin', 'موظف': 'Staff', 'مستخدم': 'User',
      'تم تسجيل الدخول بنجاح، جارٍ التحويل...': 'Login successful, redirecting...', 'فشل تسجيل الدخول، تحقق من البيانات': 'Login failed, check your credentials', 'جارٍ تسجيل الدخول...': 'Logging in...', 'جارٍ إنشاء الحساب...': 'Creating account...', 'جارٍ الإرسال...': 'Sending...', 'جارٍ التنفيذ...': 'Processing...', 'تم تسجيل الخروج بنجاح': 'Logged out successfully', 'انتهت الجلسة، يرجى تسجيل الدخول من جديد': 'Your session expired. Please log in again', 'تمت تعبئة بيانات الدخول التجريبية': 'Demo credentials filled', 'تم إنشاء الحساب بنجاح، سجّل الدخول الآن': 'Account created successfully. Log in now', 'تم إنشاء الحساب بنجاح، جارٍ التحويل لصفحة الدخول...': 'Account created successfully. Redirecting to login...',
      'سلة المشتريات': 'Shopping cart', 'إفراغ السلة': 'Clear cart', 'حذف من السلة': 'Remove from cart', 'سلة المشتريات فارغة': 'Your shopping cart is empty', 'لم تقم بإضافة أي منتجات بعد': 'You have not added any products yet', 'نعم، إفراغ السلة': 'Yes, clear cart', 'تم حذف المنتج من السلة': 'Product removed from cart', 'لا توجد منتجات مطابقة': 'No matching products', 'جرّب كلمة بحث أخرى أو تصنيفًا مختلفًا': 'Try another search term or category', 'هذا المنتج غير متوفر حاليًا': 'This product is currently unavailable', 'تعذر جلب منتجات المتجر': 'Could not load store products', 'تعذر إرسال الطلب، حاول مرة أخرى': 'Could not submit the order. Try again', 'لا يمكن إتمام الطلب': 'Checkout cannot be completed', 'جارٍ إرسال الطلب...': 'Submitting order...', 'سنتواصل معك قريبًا لتأكيد الطلب': 'We will contact you soon to confirm the order', 'تصنيف': 'Category',
      'العنوان مطلوب عند اختيار التوصيل': 'Address is required for delivery', 'قائمة المستخدم': 'User menu', 'فتح القائمة الجانبية': 'Open sidebar', 'مسار التنقل': 'Breadcrumb', 'تعذر الوصول إلى الـ API — تم التحويل تلقائيًا إلى وضع البيانات التجريبية': 'API unavailable — switched to demo mode automatically', 'حدث خطأ أثناء تحميل البيانات': 'An error occurred while loading data', 'لا توجد بيانات': 'No data available', 'العملة الحالية بالبيانات التجريبية — اضغط للإعدادات': 'Current demo currency — open settings to change it'
    },
    t(value) {
      const text = String(value ?? '');
      return this.lang === 'en' ? (this.dict[text] || text) : Object.keys(this.dict).find((k) => this.dict[k] === text) || text;
    },
    set(lang) {
      this.lang = lang === 'en' ? 'en' : 'ar';
      localStorage.setItem(this.key, this.lang);
      document.documentElement.lang = this.lang;
      document.documentElement.dir = this.lang === 'en' ? 'ltr' : 'rtl';
      document.body.classList.toggle('lang-en', this.lang === 'en');
      this.ensureSwitcher();
      this.translate(document.body);
      window.dispatchEvent(new CustomEvent('shopflow:language-changed', { detail: { lang: this.lang } }));
    },
    toggle() { this.set(this.lang === 'ar' ? 'en' : 'ar'); },
    ensureSwitcher() {
      if (document.querySelector('.lang-switcher')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lang-switcher standalone-lang-switcher';
      button.title = this.lang === 'ar' ? 'تغيير اللغة' : 'Change language';
      button.innerHTML = `<i class="bi bi-translate"></i><span>${this.lang === 'ar' ? 'EN' : 'عربي'}</span>`;
      button.addEventListener('click', () => { this.toggle(); location.reload(); });
      document.body.appendChild(button);
    },
    translate(root) {
      if (this.lang !== 'en' || !root) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const value = node.nodeValue.trim();
        if (value && this.dict[value]) node.nodeValue = node.nodeValue.replace(value, this.dict[value]);
      });
      root.querySelectorAll('[placeholder],[title],[aria-label]').forEach((el) => {
        ['placeholder', 'title', 'aria-label'].forEach((attr) => {
          if (el.hasAttribute(attr)) el.setAttribute(attr, this.t(el.getAttribute(attr)));
        });
      });
    }
  },

  /** حماية من XSS: تهريب نص قبل إدراجه في innerHTML */
  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  },

  /** تنسيق رقم مع فواصل الآلاف (رقمان عشريان عند الحاجة) */
  formatNumber(n) {
    const num = Number(n) || 0;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(num);
  },

  /** تنسيق مبلغ مالي مع رمز العملة من الإعدادات */
  formatCurrency(n) {
    return `${this.formatNumber(n)} ${this.getCurrency()}`;
  },

  getCurrency() {
    const settings = this.getSettings();
    if (this.I18n.lang === 'en' && (!settings.currency || settings.currency === 'ر.س')) return 'SAR';
    return settings.currency || 'ر.س';
  },

  /** إعدادات محلية (تُحدَّث من صفحة الإعدادات أو الـ API) */
  getSettings() {
    try { return JSON.parse(localStorage.getItem('shopflow_settings')) || {}; }
    catch { return {}; }
  },

  saveSettings(settings) {
    localStorage.setItem('shopflow_settings', JSON.stringify(settings));
  },

  /** تنسيق تاريخ بصيغة عربية: 15 سبتمبر 2026 */
  formatDate(date) {
    const d = this.parseDate(date);
    if (!d) return '—';
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(d);
  },

  /** تنسيق تاريخ ووقت: 15 سبتمبر 2026، 3:30 م */
  formatDateTime(date) {
    const d = this.parseDate(date);
    if (!d) return '—';
    return new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    }).format(d);
  },

  /** الوقت المنقضي بصيغة مختصرة (قبل قليل / قبل ساعتين ...) */
  timeAgo(date) {
    const d = this.parseDate(date);
    if (!d) return '—';
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'قبل قليل';
    if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
    if (diff < 2592000) return `قبل ${Math.floor(diff / 86400)} يوم`;
    return this.formatDate(d);
  },

  parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value) ? null : value;
    const d = new Date(value);
    return isNaN(d) ? null : d;
  },

  /** تاريخ اليوم بصيغة YYYY-MM-DD (لحقول الإدخال) */
  toDateInput(date) {
    const d = this.parseDate(date) || new Date();
    const pad = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },

  daysAgoInput(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return this.toDateInput(d);
  },

  debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  },

  getUrlParam(name) {
    return new URLSearchParams(location.search).get(name);
  },

  /** الأحرف الأولى من الاسم لصورة المستخدم الرمزية */
  getInitials(name) {
    return String(name || '؟').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
  },

  /* ------- تسميات الحالات ------- */

  saleStatus(status) {
    const map = {
      paid: { label: 'مدفوعة', class: 'badge-soft-success', icon: 'bi-check-circle' },
      partial: { label: 'مدفوعة جزئيًا', class: 'badge-soft-warning', icon: 'bi-hourglass-split' },
      unpaid: { label: 'غير مدفوعة', class: 'badge-soft-danger', icon: 'bi-x-circle' },
      cancelled: { label: 'ملغاة', class: 'badge-soft-secondary', icon: 'bi-slash-circle' }
    };
    return map[status] || { label: status, class: 'badge-soft-secondary', icon: 'bi-question-circle' };
  },

  paymentMethod(method) {
    const map = {
      cash: 'نقدي', card: 'بطاقة', transfer: 'تحويل بنكي', credit: 'آجل'
    };
    return map[method] || method || '—';
  },

  stockStatus(product) {
    const qty = Number(product.quantity) || 0;
    const min = Number(product.min_stock ?? product.minStock) || 0;
    if (qty <= 0) return { status: 'out', label: 'نفد المخزون', class: 'badge-soft-danger' };
    if (qty <= min) return { status: 'low', label: 'منخفض', class: 'badge-soft-warning' };
    return { status: 'in', label: 'متوفر', class: 'badge-soft-success' };
  },

  /* ------- التحقق من صحة النماذج ------- */

  RULE_MESSAGES: {
    required: 'هذا الحقل مطلوب',
    email: 'يرجى إدخال بريد إلكتروني صحيح',
    phone: 'يرجى إدخال رقم هاتف صحيح (7-15 رقمًا)',
    number: 'يرجى إدخال رقم صحيح',
    integer: 'يرجى إدخال رقم صحيح بدون كسور',
    min: (v) => `يجب ألا يقل عن ${v} أحرف`,
    minValue: (v) => `يجب أن تكون القيمة ${v} أو أكثر`,
    maxValue: (v) => `يجب أن تكون القيمة ${v} أو أقل`,
    match: 'القيمتان غير متطابقتين',
    checked: 'يجب الموافقة على هذا الخيار للمتابعة'
  },

  /**
   * التحقق من نموذج كامل اعتمادًا على data-validate="required|email|min:6"
   * يعرض رسائل عربية تحت كل حقل ويعيد {valid, data}
   */
  validateForm(form) {
    const fields = form.querySelectorAll('[data-validate]');
    const data = {};
    let valid = true;
    let firstInvalid = null;

    fields.forEach((field) => {
      const name = field.name || field.id;
      const rules = String(field.dataset.validate || '').split('|').filter(Boolean);
      const isCheckbox = field.type === 'checkbox';
      const value = isCheckbox ? field.checked : field.value.trim();
      data[name] = value;
      let error = null;

      for (const rule of rules) {
        const [ruleName, ruleValue] = rule.split(':');
        const msg = this.RULE_MESSAGES[ruleName];
        let failed = false;

        if (ruleName === 'required') failed = isCheckbox ? !field.checked : !value;
        else if (!isCheckbox && value !== '') {
          if (ruleName === 'email') failed = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
          else if (ruleName === 'phone') failed = !/^\+?[0-9\s\-()]{7,16}$/.test(value);
          else if (ruleName === 'number') failed = isNaN(Number(value));
          else if (ruleName === 'integer') failed = !/^\d+$/.test(value);
          else if (ruleName === 'min') failed = String(value).length < Number(ruleValue);
          else if (ruleName === 'minValue') failed = Number(value) < Number(ruleValue);
          else if (ruleName === 'maxValue') failed = Number(value) > Number(ruleValue);
          else if (ruleName === 'match') {
            const target = form.querySelector(ruleValue);
            failed = !target || target.value !== value;
          }
        }

        if (failed) {
          error = typeof msg === 'function' ? msg(ruleValue) : (field.dataset.message || msg || 'قيمة غير صحيحة');
          break;
        }
      }

      this.setFieldError(field, error);
      if (error) { valid = false; firstInvalid = firstInvalid || field; }
    });

    if (firstInvalid) firstInvalid.focus();
    return { valid, data };
  },

  /** إظهار/إخفاء رسالة خطأ تحت حقل معين */
  setFieldError(field, message) {
    field.classList.toggle('is-invalid', !!message);
    let feedback = field.parentElement.querySelector('.invalid-feedback');
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'invalid-feedback';
      field.parentElement.appendChild(feedback);
    }
    feedback.textContent = message || '';
    if (!message) field.classList.remove('is-invalid');
  },

  /** تصدير جدول إلى ملف CSV قابل للفتح في Excel (مع دعم العربية) */
  exportCsv(filename, headers, rows) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [
      headers.map(esc).join(','),
      ...rows.map((row) => row.map(esc).join(','))
    ].join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  },

  /** قراءة صورة من الجهاز وتحويلها لـ DataURL (للمعاينة والإرسال) */
  readImageFile(file, maxSize = 400) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('الملف المختار ليس صورة'));
        return;
      }
      if (file.size > maxSize * 1024) {
        reject(new Error(`حجم الصورة كبير، الحد الأقصى ${maxSize} كيلوبايت`));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
      reader.readAsDataURL(file);
    });
  },

  /** رقم فاتورة/طلب مقنّن للعرض */
  invoiceNo(no) {
    return String(no || '—');
  }
};

/* إزالة حالة الخطأ فور تعديل أي حقل */
document.addEventListener('input', (e) => {
  const field = e.target;
  if (field.classList && field.classList.contains('is-invalid')) {
    Helpers.setFieldError(field, null);
  }
});

document.addEventListener('change', (e) => {
  const field = e.target;
  if (field.classList && field.classList.contains('is-invalid')) {
    Helpers.setFieldError(field, null);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  Helpers.I18n.set(Helpers.I18n.lang);
  const observer = new MutationObserver((records) => {
    if (Helpers.I18n.lang !== 'en') return;
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) Helpers.I18n.translate(node);
    }));
  });
  observer.observe(document.body, { childList: true, subtree: true });
});

window.Helpers = Helpers;
