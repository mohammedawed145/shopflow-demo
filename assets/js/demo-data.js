'use strict';

/* ============================================================
   ShopFlow — بيانات تجريبية (تعمل مؤقتًا عند عدم توفر الـ API)
   تُخزَّن في localStorage وتدعم كل عمليات CRUD والفلاتر والتقارير
   ============================================================ */

/* مولّد أرقام عشوائية ثابت لإنتاج بيانات متسقة عند كل إعادة ضبط */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DemoData = (() => {
  const DB_KEY = 'shopflow_demo_db_v1';
  let db = null;

  function seed() {
    const rnd = mulberry32(20260917);
    const now = new Date();
    const iso = (daysAgo, hour = 12) => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      d.setHours(hour, Math.floor(rnd() * 59), 0, 0);
      return d.toISOString();
    };

    const db = {
      users: [{
        id: 1, name: 'محمد العلي', email: 'demo@shopflow.com', phone: '0500000000',
        password: '123456', role: 'owner'
      }],
      settings: {
        store_name: 'متجر الأفق', business_type: 'إلكترونيات',
        store_phone: '0501234567', store_email: 'info@alofoq.sa',
        store_address: 'الرياض - حي النخيل - طريق الملك عبدالله',
        currency: 'ر.س', tax_rate: 15, logo: ''
      },
      categories: [
        { id: 1, name: 'إلكترونيات', description: 'أجهزة وملحقات إلكترونية' },
        { id: 2, name: 'ملابس وأحذية', description: 'أزياء رجالية ونسائية' },
        { id: 3, name: 'مواد غذائية', description: 'سلع غذائية أساسية' },
        { id: 4, name: 'أدوات منزلية', description: 'أدوات ومستلزمات المنزل' },
        { id: 5, name: 'مستلزمات مكتبية', description: 'قرطاسية ومستلزمات المكاتب' }
      ],
      products: [
        { id: 1, name: 'شاحن سريع 20 واط', sku: 'SKU-1001', category_id: 1, description: 'شاحن Type-C بقوة 20 واط مع كابل مضفر', image: null, cost: 25, price: 45, quantity: 34, min_stock: 5, color: 'أبيض', size: '', material: '' },
        { id: 2, name: 'سماعة بلوتوث Pro', sku: 'SKU-1002', category_id: 1, description: 'سماعة لاسلكية بعزل ضوضاء نشط', image: null, cost: 85, price: 149, quantity: 4, min_stock: 5, color: 'أسود', size: '', material: '' },
        { id: 3, name: 'ماوس لاسلكي', sku: 'SKU-1003', category_id: 1, description: 'ماوس صامت بثلاث سرعات وDPI عالي', image: null, cost: 30, price: 59, quantity: 22, min_stock: 6, color: 'رمادي', size: '', material: '' },
        { id: 4, name: 'لوحة مفاتيح ميكانيكية', sku: 'SKU-1004', category_id: 1, description: 'لوحة مفاتيح ميكانيكية بإضاءة RGB', image: null, cost: 140, price: 249, quantity: 8, min_stock: 3, color: 'أسود', size: '', material: '' },
        { id: 5, name: 'قميص قطن رجالي', sku: 'SKU-1005', category_id: 2, description: 'قميص قطن صيفي بقصة عصرية', image: null, cost: 35, price: 75, quantity: 40, min_stock: 10, color: 'أزرق', size: 'M', material: 'قطن' },
        { id: 6, name: 'بنطال جينز كلاسيك', sku: 'SKU-1006', category_id: 2, description: 'بنطال جينز بقصة مستقيمة', image: null, cost: 55, price: 120, quantity: 18, min_stock: 8, color: 'أزرق غامق', size: '32', material: 'دنيم' },
        { id: 7, name: 'حذاء رياضي جري', sku: 'SKU-1007', category_id: 2, description: 'حذاء رياضي خفيف مخصص للجري', image: null, cost: 95, price: 189, quantity: 0, min_stock: 4, color: 'أبيض', size: '42', material: 'شبك' },
        { id: 8, name: 'حقيبة ظهر مقاومة للماء', sku: 'SKU-1008', category_id: 5, description: 'حقيبة ظهر بجيب مخصص للابتوب', image: null, cost: 60, price: 119, quantity: 12, min_stock: 5, color: 'أسود', size: '', material: 'بوليستر' },
        { id: 9, name: 'كوب حراري ستانلس', sku: 'SKU-1009', category_id: 4, description: 'كوب يحافظ على الحرارة 8 ساعات', image: null, cost: 22, price: 49, quantity: 55, min_stock: 15, color: 'فضي', size: '500 مل', material: 'ستانلس' },
        { id: 10, name: 'طقم أواني تيفال 5 قطع', sku: 'SKU-1010', category_id: 4, description: 'طقم قدور تيفال بطبقة مانعة للالتصاق', image: null, cost: 220, price: 389, quantity: 6, min_stock: 3, color: '', size: '', material: 'ألومنيوم' },
        { id: 11, name: 'زيت زيتون بكر 1 لتر', sku: 'SKU-1011', category_id: 3, description: 'زيت زيتون بكر ممتاز معصور على البارد', image: null, cost: 38, price: 65, quantity: 25, min_stock: 10, color: '', size: '1 لتر', material: '' },
        { id: 12, name: 'عسل جبلي طبيعي', sku: 'SKU-1012', category_id: 3, description: 'عسل جبلي طبيعي 100% بدون إضافات', image: null, cost: 70, price: 130, quantity: 15, min_stock: 5, color: '', size: '500 جرام', material: '' },
        { id: 13, name: 'دفتر ملاحظات جلد', sku: 'SKU-1013', category_id: 5, description: 'دفتر جلد بغلاف مطبوع و192 صفحة', image: null, cost: 12, price: 29, quantity: 60, min_stock: 20, color: 'بني', size: 'A5', material: 'جلد' }
      ],
      customers: [
        { id: 1, name: 'أحمد محمد السالم', phone: '0551234567', email: 'ahmed@example.com', address: 'الرياض - حي الملقا', notes: 'عميل دائم' },
        { id: 2, name: 'فاطمة علي', phone: '0567788990', email: 'fatima@example.com', address: 'جدة - حي الروضة', notes: '' },
        { id: 3, name: 'محمد السيد', phone: '0503344556', email: '', address: 'الرياض - حي الشفا', notes: 'يفضل الدفع نقدًا' },
        { id: 4, name: 'سارة خالد', phone: '0592211334', email: 'sara@example.com', address: 'الدمام - حي الفيصلية', notes: '' },
        { id: 5, name: 'خالد عبدالله', phone: '0544455667', email: '', address: 'الرياض - حي العليا', notes: '' },
        { id: 6, name: 'نور الهدى حسن', phone: '0577788991', email: 'nour@example.com', address: 'مكة - العزيزية', notes: '' },
        { id: 7, name: 'محمود حسن', phone: '0512345678', email: '', address: 'الرياض - حي النسيم', notes: '' },
        { id: 8, name: 'ليلى إبراهيم', phone: '0588899001', email: 'laila@example.com', address: 'الخبر - العقربية', notes: '' }
      ],
      suppliers: [
        { id: 1, name: 'شركة النور للتوريدات', company: 'شركة النور', phone: '0112223344', email: 'sales@alnoor.com', address: 'الرياض - المنطقة الصناعية', notes: 'توريد أدوات منزلية' },
        { id: 2, name: 'مؤسسة الأفق التجارية', company: 'مؤسسة الأفق', phone: '0114445566', email: 'info@alofoq-co.com', address: 'جدة - المنطقة الصناعية', notes: '' },
        { id: 3, name: 'شركة البركة للإلكترونيات', company: 'شركة البركة', phone: '0125556677', email: 'orders@barakah.com', address: 'الرياض - الصناعية القديمة', notes: 'دفع آجل 30 يوم' },
        { id: 4, name: 'مكتبة المستقبل للتوريد', company: 'مكتبة المستقبل', phone: '0136667788', email: '', address: 'الدمام - الفيصلية', notes: '' }
      ],
      sales: [],
      payments: [],
      purchases: [
        { id: 1, invoice_no: 'PUR-2026-0001', supplier_id: 3, date: iso(42), items: [{ product_id: 1, name: 'شاحن سريع 20 واط', quantity: 20, cost: 25, total: 500 }], total: 500, paid: 500, remaining: 0, notes: 'دفعة كاملة' },
        { id: 2, invoice_no: 'PUR-2026-0002', supplier_id: 1, date: iso(35), items: [{ product_id: 9, name: 'كوب حراري ستانلس', quantity: 30, cost: 22, total: 660 }, { product_id: 10, name: 'طقم أواني تيفال 5 قطع', quantity: 6, cost: 220, total: 1320 }], total: 1980, paid: 1200, remaining: 780, notes: '' },
        { id: 3, invoice_no: 'PUR-2026-0003', supplier_id: 2, date: iso(24), items: [{ product_id: 5, name: 'قميص قطن رجالي', quantity: 40, cost: 35, total: 1400 }, { product_id: 6, name: 'بنطال جينز كلاسيك', quantity: 20, cost: 55, total: 1100 }], total: 2500, paid: 2500, remaining: 0, notes: '' },
        { id: 4, invoice_no: 'PUR-2026-0004', supplier_id: 3, date: iso(12), items: [{ product_id: 2, name: 'سماعة بلوتوث Pro', quantity: 10, cost: 85, total: 850 }], total: 850, paid: 400, remaining: 450, notes: 'الباقي بعد أسبوع' },
        { id: 5, invoice_no: 'PUR-2026-0005', supplier_id: 4, date: iso(5), items: [{ product_id: 13, name: 'دفتر ملاحظات جلد', quantity: 60, cost: 12, total: 720 }, { product_id: 8, name: 'حقيبة ظهر مقاومة للماء', quantity: 12, cost: 60, total: 720 }], total: 1440, paid: 1440, remaining: 0, notes: '' }
      ],
      expenses: [
        { id: 1, date: iso(55), category: 'إيجار', amount: 2500, notes: 'إيجار المحل - الشهر الماضي' },
        { id: 2, date: iso(55), category: 'رواتب', amount: 3800, notes: 'راتب موظف واحد' },
        { id: 3, date: iso(50), category: 'فواتير', amount: 420, notes: 'فاتورة كهرباء' },
        { id: 4, date: iso(48), category: 'فواتير', amount: 90, notes: 'فاتورة ماء' },
        { id: 5, date: iso(30), category: 'إيجار', amount: 2500, notes: 'إيجار المحل - هذا الشهر' },
        { id: 6, date: iso(28), category: 'تسويق', amount: 250, notes: 'إعلانات ممولة على السوشيال ميديا' },
        { id: 7, date: iso(25), category: 'رواتب', amount: 3800, notes: 'راتب موظف واحد' },
        { id: 8, date: iso(20), category: 'شحن ونقل', amount: 140, notes: 'توصيل طلبيات للعملاء' },
        { id: 9, date: iso(14), category: 'صيانة', amount: 180, notes: 'صيانة مكيف المحل' },
        { id: 10, date: iso(9), category: 'فواتير', amount: 350, notes: 'فاتورة كهرباء' },
        { id: 11, date: iso(4), category: 'أخرى', amount: 75, notes: 'مستلزمات نظافة' },
        { id: 12, date: iso(1), category: 'شحن ونقل', amount: 95, notes: 'شحن طلبات المتجر الإلكتروني' }
      ],
      orders: [],
      notifications: [
        { id: 1, type: 'stock', title: 'مخزون منخفض', message: 'الكمية المتبقية من «سماعة بلوتوث Pro» أقل من الحد الأدنى', read: false, date: iso(1, 9) },
        { id: 2, type: 'stock', title: 'نفاد مخزون', message: 'نفدت الكمية من «حذاء رياضي جري»، يرجى إعادة التوريد', read: false, date: iso(2, 10) },
        { id: 3, type: 'sale', title: 'فاتورة جديدة', message: 'تم إنشاء فاتورة جديدة بنجاح اليوم', read: false, date: iso(0, 13) },
        { id: 4, type: 'payment', title: 'دفعة مستلمة', message: 'تم استلام دفعة من العميل أحمد محمد السالم', read: true, date: iso(3, 16) }
      ],
      counters: { user: 1, category: 5, product: 13, customer: 8, supplier: 4, sale: 0, purchase: 5, expense: 12, payment: 0, order: 0 }
    };

    /* توليد فواتير بيع تجريبية خلال آخر 30 يومًا */
    const methods = ['cash', 'card', 'transfer', 'credit'];
    for (let i = 1; i <= 22; i++) {
      const dayAgo = i <= 2 ? 0 : Math.floor(rnd() * 29);
      const itemCount = 1 + Math.floor(rnd() * 3);
      const usedIds = new Set();
      const items = [];
      for (let j = 0; j < itemCount; j++) {
        let pid = 1 + Math.floor(rnd() * db.products.length);
        while (usedIds.has(pid)) pid = 1 + Math.floor(rnd() * db.products.length);
        usedIds.add(pid);
        const p = db.products.find((x) => x.id === pid);
        const quantity = 1 + Math.floor(rnd() * 3);
        items.push({ product_id: p.id, name: p.name, sku: p.sku, price: p.price, cost: p.cost, quantity, total: p.price * quantity });
      }
      const subtotal = items.reduce((s, it) => s + it.total, 0);
      const discount = rnd() < 0.2 ? Math.round(subtotal * 0.05) : 0;
      const taxRate = 15;
      const taxAmount = ((subtotal - discount) * taxRate) / 100;
      const total = Math.round((subtotal - discount + taxAmount) * 100) / 100;
      const roll = rnd();
      let paid = total;
      if (roll < 0.15) paid = 0;
      else if (roll < 0.4) paid = Math.round(total * (0.4 + rnd() * 0.4));
      const customer = rnd() < 0.85 ? db.customers[Math.floor(rnd() * db.customers.length)] : null;
      const date = iso(dayAgo, 9 + Math.floor(rnd() * 10));
      const sale = {
        id: i, invoice_no: `INV-2026-${String(i).padStart(4, '0')}`, date,
        customer_id: customer ? customer.id : null, customer_name: customer ? customer.name : 'عميل نقدي',
        items, subtotal, discount, tax_rate: taxRate, tax_amount: taxAmount, total, paid,
        remaining: Math.round((total - paid) * 100) / 100,
        payment_method: methods[Math.floor(rnd() * methods.length)],
        status: paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
        notes: ''
      };
      db.sales.push(sale);
      db.counters.sale = i;
      if (paid > 0) {
        db.counters.payment++;
        db.payments.push({ id: db.counters.payment, customer_id: sale.customer_id, sale_id: sale.id, amount: paid, method: sale.payment_method, date, notes: 'دفعة عند إصدار الفاتورة' });
      }
    }

    /* دفعات لاحقة على بعض الفواتير غير المسددة */
    const unpaid = db.sales.filter((s) => s.remaining > 0).slice(0, 4);
    unpaid.forEach((sale) => {
      const amount = Math.min(sale.remaining, Math.round(sale.remaining * 0.5));
      if (amount <= 0) return;
      db.counters.payment++;
      db.payments.push({ id: db.counters.payment, customer_id: sale.customer_id, sale_id: sale.id, amount, method: 'cash', date: iso(0, 15), notes: 'دفعة لاحقة' });
      sale.paid += amount;
      sale.remaining = Math.round((sale.total - sale.paid) * 100) / 100;
      sale.status = sale.remaining <= 0 ? 'paid' : 'partial';
    });

    return db;
  }

  function load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function save() {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function get() {
    if (!db) db = load() || seed();
    return db;
  }

  function reset() {
    db = seed();
    save();
  }

  return { get, save, reset, DB_KEY };
})();

/* ============================================================
   DemoAPI — معالج طلبات يحاكي الـ REST API في وضع البيانات التجريبية
   ============================================================ */

const DemoAPI = {
  TOKEN: 'demo-token',

  async handle(method, path, { body = {}, params = {}, token } = {}) {
    await new Promise((r) => setTimeout(r, 180 + Math.random() * 260));

    const clean = String(path).replace(/^\/?(api\/)?/, '').replace(/\?.*$/, '').replace(/\/+$/, '');
    const seg = clean.split('/').filter(Boolean);
    const db = DemoData.get();

    /* التحقق من الجلسة (عدا مسارات المصادقة والمتجر العام) */
    const isPublic = seg[0] === 'auth' || seg[0] === 'store';
    if (!isPublic && token !== this.TOKEN) {
      throw { demo: true, status: 401, message: 'انتهت الجلسة، يرجى تسجيل الدخول من جديد' };
    }

    const id = Number(seg[1]) || 0;
    const scope = seg[0];

    /* ---------- المصادقة ---------- */
    if (scope === 'auth') {
      if (seg[1] === 'login' && method === 'POST') {
        const user = db.users.find((u) => (u.email === String(body.identifier || '').trim() || u.phone === String(body.identifier || '').trim()));
        if (!user || user.password !== String(body.password || '')) {
          throw { demo: true, status: 401, message: 'البريد الإلكتروني / رقم الهاتف أو كلمة المرور غير صحيحة' };
        }
        return this.ok('تم تسجيل الدخول بنجاح', {
          token: this.TOKEN,
          user: this.serializeUser(user, db),
          store: db.settings
        });
      }

      if (seg[1] === 'register' && method === 'POST') {
        const email = String(body.email || '').trim().toLowerCase();
        if (db.users.some((u) => u.email.toLowerCase() === email)) {
          throw { demo: true, status: 422, message: 'البريد الإلكتروني مسجل مسبقًا، جرّب تسجيل الدخول' };
        }
        db.counters.user++;
        db.users.push({
          id: db.counters.user, name: body.name, email, phone: body.phone,
          password: body.password, role: 'owner'
        });
        Object.assign(db.settings, {
          store_name: body.store_name || db.settings.store_name,
          business_type: body.business_type || db.settings.business_type,
          store_address: body.address || db.settings.store_address,
          store_phone: body.phone || db.settings.store_phone
        });
        DemoData.save();
        return this.ok('تم إنشاء الحساب بنجاح، يمكنك تسجيل الدخول الآن');
      }

      if (seg[1] === 'forgot-password' && method === 'POST') {
        return this.ok('إذا كان البريد الإلكتروني مسجلًا لدينا فسيصلك رابط إعادة التعيين خلال دقائق');
      }

      if (seg[1] === 'change-password' && method === 'POST') {
        const user = db.users.find((u) => u.id === (Number(body.user_id) || db.users[0].id));
        if (!user || user.password !== String(body.current_password || '')) {
          throw { demo: true, status: 422, message: 'كلمة المرور الحالية غير صحيحة' };
        }
        user.password = body.new_password;
        DemoData.save();
        return this.ok('تم تغيير كلمة المرور بنجاح');
      }
    }

    /* ---------- لوحة التحكم ---------- */
    if (scope === 'dashboard' && method === 'GET') {
      const today = Helpers.toDateInput();
      const month = today.slice(0, 7);
      const valid = db.sales.filter((s) => s.status !== 'cancelled');
      const sum = (list) => list.reduce((s, x) => s + Number(x.total || 0), 0);
      const monthSales = valid.filter((s) => s.date.slice(0, 7) === month);
      const monthProfit = monthSales.reduce((s, sale) => s + sale.items.reduce((a, it) => a + (it.price - it.cost) * it.quantity, 0), 0);
      const monthExpenses = db.expenses.filter((e) => e.date.slice(0, 7) === month).reduce((s, e) => s + e.amount, 0);

      const chart = [];
      for (let i = 13; i >= 0; i--) {
        const day = Helpers.daysAgoInput(i);
        chart.push({ date: day, total: sum(valid.filter((s) => s.date.slice(0, 10) === day)) });
      }

      return this.ok('تم جلب بيانات لوحة التحكم', {
        today_sales: sum(valid.filter((s) => s.date.slice(0, 10) === today)),
        month_sales: sum(monthSales),
        net_profit: Math.round((monthProfit - monthExpenses) * 100) / 100,
        products_count: db.products.length,
        low_stock_count: db.products.filter((p) => p.quantity <= (p.min_stock || 0)).length,
        customers_debt: this.customerDebt(db, null).total,
        suppliers_debt: this.supplierDebt(db, null).total,
        sales_chart: chart,
        latest_invoices: [...valid].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8)
          .map((s) => ({ id: s.id, invoice_no: s.invoice_no, customer_name: s.customer_name, total: s.total, paid: s.paid, remaining: s.remaining, status: s.status, date: s.date })),
        low_stock_products: db.products.filter((p) => p.quantity <= (p.min_stock || 0)).slice(0, 6)
          .map((p) => ({ ...p, category_name: this.categoryName(db, p.category_id) }))
      });
    }

    /* ---------- المنتجات ---------- */
    if (scope === 'products') {
      if (method === 'GET' && !id) {
        let list = db.products.map((p) => ({ ...p, category_name: this.categoryName(db, p.category_id) }));
        if (params.search) {
          const q = String(params.search).trim().toLowerCase();
          list = list.filter((p) => p.name.toLowerCase().includes(q) || String(p.sku).toLowerCase().includes(q));
        }
        if (params.category_id) list = list.filter((p) => String(p.category_id) === String(params.category_id));
        if (params.stock_status) list = list.filter((p) => Helpers.stockStatus(p).status === params.stock_status);
        list.sort((a, b) => b.id - a.id);
        return this.ok('تم جلب المنتجات', ...this.paginate(list, params));
      }
      if (method === 'GET' && id) {
        const p = db.products.find((x) => x.id === id);
        if (!p) throw { demo: true, status: 404, message: 'المنتج غير موجود' };
        return this.ok('تم جلب المنتج', { ...p, category_name: this.categoryName(db, p.category_id) });
      }
      if (method === 'POST') {
        if (!body.name || !body.price) throw { demo: true, status: 422, message: 'اسم المنتج وسعر البيع حقولان مطلوبان' };
        db.counters.product++;
        const product = {
          id: db.counters.product, name: body.name, sku: body.sku || `SKU-${1000 + db.counters.product}`,
          category_id: Number(body.category_id) || null, description: body.description || '',
          image: body.image || null, cost: Number(body.cost) || 0, price: Number(body.price) || 0,
          quantity: Number(body.quantity) || 0, min_stock: Number(body.min_stock) || 0,
          color: body.color || '', size: body.size || '', material: body.material || ''
        };
        db.products.push(product);
        DemoData.save();
        return this.ok('تم إضافة المنتج بنجاح', product);
      }
      if (method === 'PUT' && id) {
        const p = db.products.find((x) => x.id === id);
        if (!p) throw { demo: true, status: 404, message: 'المنتج غير موجود' };
        Object.assign(p, {
          name: body.name ?? p.name, sku: body.sku ?? p.sku, category_id: body.category_id !== undefined ? Number(body.category_id) || null : p.category_id,
          description: body.description ?? p.description, image: body.image ?? p.image,
          cost: body.cost !== undefined ? Number(body.cost) || 0 : p.cost, price: body.price !== undefined ? Number(body.price) || 0 : p.price,
          quantity: body.quantity !== undefined ? Number(body.quantity) || 0 : p.quantity, min_stock: body.min_stock !== undefined ? Number(body.min_stock) || 0 : p.min_stock,
          color: body.color ?? p.color, size: body.size ?? p.size, material: body.material ?? p.material
        });
        DemoData.save();
        return this.ok('تم تحديث المنتج بنجاح', p);
      }
      if (method === 'PUT' && seg[2] === 'stock' && Number(seg[1])) {
        const p = db.products.find((x) => x.id === Number(seg[1]));
        if (!p) throw { demo: true, status: 404, message: 'المنتج غير موجود' };
        if (body.quantity === undefined || Number(body.quantity) < 0) throw { demo: true, status: 422, message: 'الكمية غير صحيحة' };
        p.quantity = Number(body.quantity);
        DemoData.save();
        return this.ok('تم تحديث المخزون بنجاح', p);
      }
      if (method === 'DELETE' && id) {
        const idx = db.products.findIndex((x) => x.id === id);
        if (idx === -1) throw { demo: true, status: 404, message: 'المنتج غير موجود' };
        db.products.splice(idx, 1);
        DemoData.save();
        return this.ok('تم حذف المنتج بنجاح');
      }
    }

    /* ---------- التصنيفات ---------- */
    if (scope === 'categories') {
      if (method === 'GET') {
        const list = db.categories.map((c) => ({ ...c, products_count: db.products.filter((p) => p.category_id === c.id).length }));
        return this.ok('تم جلب التصنيفات', ...this.paginate(list, { per_page: 100, page: 1 }));
      }
      if (method === 'POST') {
        if (!body.name) throw { demo: true, status: 422, message: 'اسم التصنيف مطلوب' };
        db.counters.category++;
        const cat = { id: db.counters.category, name: body.name, description: body.description || '' };
        db.categories.push(cat);
        DemoData.save();
        return this.ok('تم إضافة التصنيف بنجاح', cat);
      }
      if (method === 'PUT' && id) {
        const cat = db.categories.find((x) => x.id === id);
        if (!cat) throw { demo: true, status: 404, message: 'التصنيف غير موجود' };
        cat.name = body.name ?? cat.name;
        cat.description = body.description ?? cat.description;
        DemoData.save();
        return this.ok('تم تحديث التصنيف بنجاح', cat);
      }
      if (method === 'DELETE' && id) {
        if (db.products.some((p) => p.category_id === id)) {
          throw { demo: true, status: 400, message: 'لا يمكن حذف تصنيف مرتبط بمنتجات، انقل المنتجات إلى تصنيف آخر أولًا' };
        }
        db.categories = db.categories.filter((x) => x.id !== id);
        DemoData.save();
        return this.ok('تم حذف التصنيف بنجاح');
      }
    }

    /* ---------- العملاء ---------- */
    if (scope === 'customers' && !seg[2]) {
      if (method === 'GET' && !id) {
        let list = db.customers.map((c) => ({ ...c, ...this.customerTotals(db, c.id) }));
        if (params.search) {
          const q = String(params.search).trim().toLowerCase();
          list = list.filter((c) => c.name.toLowerCase().includes(q) || String(c.phone).includes(q));
        }
        list.sort((a, b) => b.id - a.id);
        return this.ok('تم جلب العملاء', ...this.paginate(list, params));
      }
      if (method === 'GET' && id) {
        const c = db.customers.find((x) => x.id === id);
        if (!c) throw { demo: true, status: 404, message: 'العميل غير موجود' };
        const invoices = db.sales.filter((s) => s.customer_id === id).sort((a, b) => new Date(b.date) - new Date(a.date));
        const payments = db.payments.filter((p) => p.customer_id === id).sort((a, b) => new Date(b.date) - new Date(a.date));
        const statement = this.buildStatement(db, id);
        return this.ok('تم جلب بيانات العميل', {
          customer: { ...c, ...this.customerTotals(db, id) },
          invoices, payments, statement
        });
      }
      if (method === 'POST') {
        if (!body.name || !body.phone) throw { demo: true, status: 422, message: 'اسم العميل ورقم الهاتف مطلوبان' };
        db.counters.customer++;
        const c = { id: db.counters.customer, name: body.name, phone: body.phone, email: body.email || '', address: body.address || '', notes: body.notes || '' };
        db.customers.push(c);
        DemoData.save();
        return this.ok('تم إضافة العميل بنجاح', c);
      }
      if (method === 'PUT' && id) {
        const c = db.customers.find((x) => x.id === id);
        if (!c) throw { demo: true, status: 404, message: 'العميل غير موجود' };
        Object.assign(c, { name: body.name ?? c.name, phone: body.phone ?? c.phone, email: body.email ?? c.email, address: body.address ?? c.address, notes: body.notes ?? c.notes });
        DemoData.save();
        return this.ok('تم تحديث بيانات العميل بنجاح', c);
      }
      if (method === 'DELETE' && id) {
        if (db.sales.some((s) => s.customer_id === id)) {
          throw { demo: true, status: 400, message: 'لا يمكن حذف عميل لديه فواتير مسجلة' };
        }
        db.customers = db.customers.filter((x) => x.id !== id);
        DemoData.save();
        return this.ok('تم حذف العميل بنجاح');
      }
    }

    /* دفعات العملاء */
    if (scope === 'customers' && seg[2] === 'payments' && method === 'POST') {
      const c = db.customers.find((x) => x.id === id);
      if (!c) throw { demo: true, status: 404, message: 'العميل غير موجود' };
      const amount = Number(body.amount);
      if (!amount || amount <= 0) throw { demo: true, status: 422, message: 'أدخل مبلغ دفعة صحيحًا أكبر من صفر' };
      db.counters.payment++;
      db.payments.push({
        id: db.counters.payment, customer_id: id, sale_id: null,
        amount, method: body.method || 'cash', date: body.date || new Date().toISOString(), notes: body.notes || ''
      });
      this.notify(db, 'payment', 'دفعة مستلمة', `تم استلام دفعة من العميل ${c.name}`);
      DemoData.save();
      return this.ok('تم تسجيل الدفعة بنجاح', { ...this.customerTotals(db, id) });
    }

    /* ---------- الموردون ---------- */
    if (scope === 'suppliers' && !seg[2]) {
      if (method === 'GET') {
        let list = db.suppliers.map((s) => ({ ...s, ...this.supplierTotals(db, s.id) }));
        if (params.search) {
          const q = String(params.search).trim().toLowerCase();
          list = list.filter((s) => s.name.toLowerCase().includes(q) || String(s.phone).includes(q));
        }
        list.sort((a, b) => b.id - a.id);
        return this.ok('تم جلب الموردين', ...this.paginate(list, params));
      }
      if (method === 'POST') {
        if (!body.name || !body.phone) throw { demo: true, status: 422, message: 'اسم المورد ورقم الهاتف مطلوبان' };
        db.counters.supplier++;
        const s = { id: db.counters.supplier, name: body.name, company: body.company || '', phone: body.phone, email: body.email || '', address: body.address || '', notes: body.notes || '' };
        db.suppliers.push(s);
        DemoData.save();
        return this.ok('تم إضافة المورد بنجاح', s);
      }
      if (method === 'PUT' && id) {
        const s = db.suppliers.find((x) => x.id === id);
        if (!s) throw { demo: true, status: 404, message: 'المورد غير موجود' };
        Object.assign(s, { name: body.name ?? s.name, company: body.company ?? s.company, phone: body.phone ?? s.phone, email: body.email ?? s.email, address: body.address ?? s.address, notes: body.notes ?? s.notes });
        DemoData.save();
        return this.ok('تم تحديث بيانات المورد بنجاح', s);
      }
      if (method === 'DELETE' && id) {
        if (db.purchases.some((p) => p.supplier_id === id)) {
          throw { demo: true, status: 400, message: 'لا يمكن حذف مورد لديه فواتير شراء مسجلة' };
        }
        db.suppliers = db.suppliers.filter((x) => x.id !== id);
        DemoData.save();
        return this.ok('تم حذف المورد بنجاح');
      }
    }

    /* دفعات الموردين: تُخصم من أقدم فاتورة شراء غير مسددة */
    if (scope === 'suppliers' && seg[2] === 'payments' && method === 'POST') {
      const s = db.suppliers.find((x) => x.id === id);
      if (!s) throw { demo: true, status: 404, message: 'المورد غير موجود' };
      const amount = Number(body.amount);
      const totals = this.supplierTotals(db, id);
      if (!amount || amount <= 0) throw { demo: true, status: 422, message: 'أدخل مبلغ دفعة صحيحًا أكبر من صفر' };
      if (amount > totals.remaining) throw { demo: true, status: 422, message: `المبلغ أكبر من المتبقي للمورد (${Helpers.formatNumber(totals.remaining)})` };
      let rest = amount;
      db.purchases.filter((p) => p.supplier_id === id && p.remaining > 0)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .forEach((p) => {
          if (rest <= 0) return;
          const pay = Math.min(rest, p.remaining);
          p.paid += pay;
          p.remaining -= pay;
          rest -= pay;
        });
      this.notify(db, 'payment', 'دفعة لمورد', `تم تسجيل دفعة للمورد ${s.name}`);
      DemoData.save();
      return this.ok('تم تسجيل الدفعة بنجاح', this.supplierTotals(db, id));
    }

    /* ---------- المبيعات ---------- */
    if (scope === 'sales' && !seg[2]) {
      if (method === 'GET' && !id) {
        let list = db.sales.map((s) => ({ ...s }));
        if (params.search) {
          const q = String(params.search).trim().toLowerCase();
          list = list.filter((s) => s.invoice_no.toLowerCase().includes(q) || String(s.customer_name || '').toLowerCase().includes(q));
        }
        if (params.from) list = list.filter((s) => s.date.slice(0, 10) >= params.from);
        if (params.to) list = list.filter((s) => s.date.slice(0, 10) <= params.to);
        if (params.status) list = list.filter((s) => s.status === params.status);
        list.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
        return this.ok('تم جلب الفواتير', ...this.paginate(list, params));
      }
      if (method === 'GET' && id) {
        const s = db.sales.find((x) => x.id === id);
        if (!s) throw { demo: true, status: 404, message: 'الفاتورة غير موجودة' };
        return this.ok('تم جلب الفاتورة', s);
      }
      if (method === 'POST') {
        const items = Array.isArray(body.items) ? body.items : [];
        if (!items.length) throw { demo: true, status: 422, message: 'أضف منتجًا واحدًا على الأقل إلى الفاتورة' };

        const prepared = [];
        for (const it of items) {
          const p = db.products.find((x) => x.id === Number(it.product_id));
          if (!p) throw { demo: true, status: 422, message: 'أحد المنتجات غير موجود' };
          const quantity = Number(it.quantity) || 0;
          if (quantity <= 0) throw { demo: true, status: 422, message: `الكمية المطلوبة من «${p.name}» غير صحيحة` };
          if (quantity > p.quantity) {
            throw { demo: true, status: 422, message: `الكمية المطلوبة من «${p.name}» غير متوفرة (المتاح: ${p.quantity})` };
          }
          const price = Number(it.price) || p.price;
          prepared.push({ product_id: p.id, name: p.name, sku: p.sku, price, cost: p.cost, quantity, total: Math.round(price * quantity * 100) / 100 });
        }

        const subtotal = prepared.reduce((s, it) => s + it.total, 0);
        const discount = Math.min(Math.max(Number(body.discount) || 0, 0), subtotal);
        const taxRate = Math.max(Number(body.tax_rate) || 0, 0);
        const taxAmount = Math.round(((subtotal - discount) * taxRate) / 100 * 100) / 100;
        const total = Math.round((subtotal - discount + taxAmount) * 100) / 100;
        let paid = Math.min(Math.max(Number(body.paid) || 0, 0), total);
        const customer = body.customer_id ? db.customers.find((c) => c.id === Number(body.customer_id)) : null;

        db.counters.sale++;
        const sale = {
          id: db.counters.sale, invoice_no: `INV-${new Date().getFullYear()}-${String(db.counters.sale).padStart(4, '0')}`,
          date: new Date().toISOString(), customer_id: customer ? customer.id : null,
          customer_name: customer ? customer.name : 'عميل نقدي',
          items: prepared, subtotal, discount, tax_rate: taxRate, tax_amount: taxAmount, total, paid,
          remaining: Math.round((total - paid) * 100) / 100,
          payment_method: body.payment_method || 'cash',
          status: paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid',
          notes: body.notes || ''
        };

        prepared.forEach((it) => {
          const p = db.products.find((x) => x.id === it.product_id);
          p.quantity -= it.quantity;
        });
        db.sales.push(sale);
        if (paid > 0) {
          db.counters.payment++;
          db.payments.push({ id: db.counters.payment, customer_id: sale.customer_id, sale_id: sale.id, amount: paid, method: sale.payment_method, date: sale.date, notes: 'دفعة عند إصدار الفاتورة' });
        }
        this.notify(db, 'sale', 'فاتورة جديدة', `تم إنشاء الفاتورة ${sale.invoice_no} بمبلغ ${Helpers.formatNumber(sale.total)}`);
        DemoData.save();
        return this.ok('تم حفظ الفاتورة بنجاح', sale);
      }
    }

    /* إلغاء فاتورة */
    if (scope === 'sales' && seg[2] === 'cancel' && method === 'PUT') {
      const s = db.sales.find((x) => x.id === id);
      if (!s) throw { demo: true, status: 404, message: 'الفاتورة غير موجودة' };
      if (s.status === 'cancelled') throw { demo: true, status: 400, message: 'الفاتورة ملغاة بالفعل' };
      s.items.forEach((it) => {
        const p = db.products.find((x) => x.id === it.product_id);
        if (p) p.quantity += it.quantity;
      });
      s.status = 'cancelled';
      DemoData.save();
      return this.ok('تم إلغاء الفاتورة وإرجاع الكميات إلى المخزون');
    }

    /* دفعة على فاتورة */
    if (scope === 'sales' && seg[2] === 'payments' && method === 'POST') {
      const s = db.sales.find((x) => x.id === id);
      if (!s) throw { demo: true, status: 404, message: 'الفاتورة غير موجودة' };
      if (s.status === 'cancelled') throw { demo: true, status: 400, message: 'لا يمكن تسجيل دفعات على فاتورة ملغاة' };
      const amount = Number(body.amount);
      if (!amount || amount <= 0) throw { demo: true, status: 422, message: 'أدخل مبلغًا صحيحًا أكبر من صفر' };
      if (amount > s.remaining) throw { demo: true, status: 422, message: `المبلغ أكبر من المتبقي على الفاتورة (${Helpers.formatNumber(s.remaining)})` };
      s.paid += amount;
      s.remaining = Math.round((s.total - s.paid) * 100) / 100;
      s.status = s.remaining <= 0 ? 'paid' : 'partial';
      db.counters.payment++;
      db.payments.push({ id: db.counters.payment, customer_id: s.customer_id, sale_id: s.id, amount, method: body.method || 'cash', date: body.date || new Date().toISOString(), notes: body.notes || '' });
      this.notify(db, 'payment', 'دفعة مستلمة', `تم استلام دفعة على الفاتورة ${s.invoice_no}`);
      DemoData.save();
      return this.ok('تم تسجيل الدفعة بنجاح', s);
    }

    /* ---------- المشتريات ---------- */
    if (scope === 'purchases' && !seg[2]) {
      if (method === 'GET') {
        let list = db.purchases.map((p) => ({ ...p, supplier_name: (db.suppliers.find((s) => s.id === p.supplier_id) || {}).name || '—' }));
        if (params.search) {
          const q = String(params.search).trim().toLowerCase();
          list = list.filter((p) => p.invoice_no.toLowerCase().includes(q) || String(p.supplier_name).toLowerCase().includes(q));
        }
        if (params.from) list = list.filter((p) => p.date.slice(0, 10) >= params.from);
        if (params.to) list = list.filter((p) => p.date.slice(0, 10) <= params.to);
        list.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
        return this.ok('تم جلب فواتير الشراء', ...this.paginate(list, params));
      }
      if (method === 'POST') {
        const supplier = db.suppliers.find((s) => s.id === Number(body.supplier_id));
        if (!supplier) throw { demo: true, status: 422, message: 'اختر موردًا صحيحًا' };
        const items = Array.isArray(body.items) ? body.items : [];
        if (!items.length) throw { demo: true, status: 422, message: 'أضف صنفًا واحدًا على الأقل لفاتورة الشراء' };
        const prepared = items.map((it) => {
          const p = db.products.find((x) => x.id === Number(it.product_id));
          if (!p) throw { demo: true, status: 422, message: 'أحد الأصناف غير موجود' };
          const quantity = Number(it.quantity) || 0;
          const cost = Number(it.cost) || p.cost;
          if (quantity <= 0) throw { demo: true, status: 422, message: `كمية الشراء من «${p.name}» غير صحيحة` };
          return { product_id: p.id, name: p.name, quantity, cost, total: cost * quantity };
        });
        const total = prepared.reduce((s, it) => s + it.total, 0);
        const paid = Math.min(Math.max(Number(body.paid) || 0, 0), total);
        db.counters.purchase++;
        const purchase = {
          id: db.counters.purchase, invoice_no: `PUR-${new Date().getFullYear()}-${String(db.counters.purchase).padStart(4, '0')}`,
          supplier_id: supplier.id, supplier_name: supplier.name,
          date: body.date || new Date().toISOString(),
          items: prepared, total, paid, remaining: Math.round((total - paid) * 100) / 100, notes: body.notes || ''
        };
        prepared.forEach((it) => {
          const p = db.products.find((x) => x.id === it.product_id);
          p.quantity += it.quantity;
        });
        db.purchases.push(purchase);
        this.notify(db, 'purchase', 'فاتورة شراء جديدة', `تم تسجيل فاتورة شراء من ${supplier.name} بمبلغ ${Helpers.formatNumber(total)}`);
        DemoData.save();
        return this.ok('تم حفظ فاتورة الشراء وتحديث المخزون', purchase);
      }
      if (method === 'DELETE' && id) {
        const idx = db.purchases.findIndex((x) => x.id === id);
        if (idx === -1) throw { demo: true, status: 404, message: 'فاتورة الشراء غير موجودة' };
        const purchase = db.purchases[idx];
        purchase.items.forEach((it) => {
          const p = db.products.find((x) => x.id === it.product_id);
          if (p) p.quantity = Math.max(0, p.quantity - it.quantity);
        });
        db.purchases.splice(idx, 1);
        DemoData.save();
        return this.ok('تم حذف فاتورة الشراء وتعديل المخزون');
      }
    }

    /* ---------- المصروفات ---------- */
    if (scope === 'expenses') {
      if (method === 'GET') {
        let list = [...db.expenses];
        if (params.from) list = list.filter((e) => e.date.slice(0, 10) >= params.from);
        if (params.to) list = list.filter((e) => e.date.slice(0, 10) <= params.to);
        if (params.category) list = list.filter((e) => e.category === params.category);
        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        const month = Helpers.toDateInput().slice(0, 7);
        return this.ok('تم جلب المصروفات', ...this.paginate(list, params), {
          summary: {
            total: list.reduce((s, e) => s + e.amount, 0),
            count: list.length,
            this_month: db.expenses.filter((e) => e.date.slice(0, 7) === month).reduce((s, e) => s + e.amount, 0)
          }
        });
      }
      if (method === 'POST') {
        const amount = Number(body.amount);
        if (!body.date || !amount || amount <= 0) throw { demo: true, status: 422, message: 'التاريخ والمبلغ حقولان مطلوبان، والمبلغ يجب أن يكون أكبر من صفر' };
        db.counters.expense++;
        const exp = { id: db.counters.expense, date: body.date, category: body.category || 'أخرى', amount, notes: body.notes || '' };
        db.expenses.push(exp);
        DemoData.save();
        return this.ok('تم إضافة المصروف بنجاح', exp);
      }
      if (method === 'PUT' && id) {
        const exp = db.expenses.find((x) => x.id === id);
        if (!exp) throw { demo: true, status: 404, message: 'المصروف غير موجود' };
        Object.assign(exp, {
          date: body.date ?? exp.date, category: body.category ?? exp.category,
          amount: body.amount !== undefined ? Number(body.amount) || exp.amount : exp.amount, notes: body.notes ?? exp.notes
        });
        DemoData.save();
        return this.ok('تم تحديث المصروف بنجاح', exp);
      }
      if (method === 'DELETE' && id) {
        db.expenses = db.expenses.filter((x) => x.id !== id);
        DemoData.save();
        return this.ok('تم حذف المصروف بنجاح');
      }
    }

    /* ---------- التقارير ---------- */
    if (scope === 'reports' && method === 'GET') {
      const from = params.from || Helpers.daysAgoInput(365);
      const to = params.to || Helpers.toDateInput();
      const inRange = (date) => { const d = date.slice(0, 10); return d >= from && d <= to; };
      const valid = db.sales.filter((s) => s.status !== 'cancelled' && inRange(s.date));

      if (seg[1] === 'sales') {
        const total = valid.reduce((s, x) => s + x.total, 0);
        const days = {};
        valid.forEach((s) => {
          const d = s.date.slice(0, 10);
          days[d] = (days[d] || 0) + s.total;
        });
        return this.ok('تم جلب تقرير المبيعات', {
          total, count: valid.length,
          avg: valid.length ? Math.round((total / valid.length) * 100) / 100 : 0,
          days: Object.keys(days).sort().map((d) => ({ date: d, total: days[d] })),
          invoices: valid.sort((a, b) => new Date(b.date) - new Date(a.date))
        });
      }

      if (seg[1] === 'profit') {
        let revenue = 0, cost = 0;
        const perProduct = {};
        valid.forEach((s) => s.items.forEach((it) => {
          revenue += it.price * it.quantity;
          cost += it.cost * it.quantity;
          if (!perProduct[it.product_id]) perProduct[it.product_id] = { name: it.name, sku: it.sku, qty: 0, revenue: 0, cost: 0 };
          perProduct[it.product_id].qty += it.quantity;
          perProduct[it.product_id].revenue += it.price * it.quantity;
          perProduct[it.product_id].cost += it.cost * it.quantity;
        }));
        const expenses = db.expenses.filter((e) => inRange(e.date)).reduce((s, e) => s + e.amount, 0);
        return this.ok('تم جلب تقرير الأرباح', {
          revenue, cost, gross_profit: revenue - cost, expenses,
          net_profit: revenue - cost - expenses,
          items: Object.values(perProduct).map((p) => ({
            ...p, profit: p.revenue - p.cost,
            margin: p.revenue ? Math.round(((p.revenue - p.cost) / p.revenue) * 100) : 0
          })).sort((a, b) => b.profit - a.profit)
        });
      }

      if (seg[1] === 'inventory') {
        const items = db.products.map((p) => ({
          ...p, category_name: this.categoryName(db, p.category_id),
          stock_cost: p.cost * p.quantity, stock_retail: p.price * p.quantity
        }));
        return this.ok('تم جلب تقرير المخزون', {
          stock_value_cost: items.reduce((s, p) => s + p.stock_cost, 0),
          stock_value_retail: items.reduce((s, p) => s + p.stock_retail, 0),
          products_count: items.length,
          low_count: items.filter((p) => p.quantity <= (p.min_stock || 0) && p.quantity > 0).length,
          out_count: items.filter((p) => p.quantity <= 0).length,
          items: items.sort((a, b) => a.quantity - b.quantity)
        });
      }

      if (seg[1] === 'top-products') {
        const stats = {};
        valid.forEach((s) => s.items.forEach((it) => {
          if (!stats[it.product_id]) stats[it.product_id] = { name: it.name, sku: it.sku, qty: 0, revenue: 0, orders: 0 };
          stats[it.product_id].qty += it.quantity;
          stats[it.product_id].revenue += it.price * it.quantity;
          stats[it.product_id].orders += 1;
        }));
        return this.ok('تم جلب تقرير الأكثر مبيعًا', {
          items: Object.values(stats).sort((a, b) => b.qty - a.qty).slice(0, 10)
        });
      }

      if (seg[1] === 'debts') {
        const customers = db.customers.map((c) => ({ ...c, ...this.customerTotals(db, c.id) })).filter((c) => c.remaining > 0);
        const suppliers = db.suppliers.map((s) => ({ ...s, ...this.supplierTotals(db, s.id) })).filter((s) => s.remaining > 0);
        return this.ok('تم جلب تقرير الديون', {
          customers, suppliers,
          customers_total: customers.reduce((s, c) => s + c.remaining, 0),
          suppliers_total: suppliers.reduce((s, x) => s + x.remaining, 0)
        });
      }

      if (seg[1] === 'expenses') {
        const list = db.expenses.filter((e) => inRange(e.date));
        const byCat = {};
        list.forEach((e) => {
          if (!byCat[e.category]) byCat[e.category] = { category: e.category, total: 0, count: 0 };
          byCat[e.category].total += e.amount;
          byCat[e.category].count += 1;
        });
        return this.ok('تم جلب تقرير المصروفات', {
          total: list.reduce((s, e) => s + e.amount, 0),
          by_category: Object.values(byCat).sort((a, b) => b.total - a.total),
          items: list.sort((a, b) => new Date(b.date) - new Date(a.date))
        });
      }
    }

    /* ---------- الإعدادات ---------- */
    if (scope === 'settings') {
      if (method === 'GET') return this.ok('تم جلب الإعدادات', db.settings);
      if (method === 'PUT') {
        Object.assign(db.settings, body);
        DemoData.save();
        return this.ok('تم حفظ الإعدادات بنجاح', db.settings);
      }
    }

    /* ---------- المتجر الإلكتروني (عام، بدون مصادقة) ---------- */
    if (scope === 'store') {
      if (seg[1] === 'products' && method === 'GET') {
        let list = db.products.filter((p) => p.quantity > 0)
          .map((p) => ({ id: p.id, name: p.name, price: p.price, image: p.image, description: p.description, quantity: p.quantity, category_id: p.category_id, category_name: this.categoryName(db, p.category_id) }));
        if (params.search) {
          const q = String(params.search).trim().toLowerCase();
          list = list.filter((p) => p.name.toLowerCase().includes(q) || String(p.description || '').toLowerCase().includes(q));
        }
        if (params.category_id) list = list.filter((p) => String(p.category_id) === String(params.category_id));
        const [data, meta] = this.paginate(list, { per_page: 60, page: 1 });
        meta.store = { name: db.settings.store_name, logo: db.settings.logo || '' };
        return this.ok('تم جلب منتجات المتجر', data, meta);
      }
      if (seg[1] === 'orders' && method === 'POST') {
        if (!body.customer_name || !body.phone) throw { demo: true, status: 422, message: 'الاسم ورقم الهاتف مطلوبان لإتمام الطلب' };
        const items = Array.isArray(body.items) ? body.items : [];
        if (!items.length) throw { demo: true, status: 422, message: 'سلة الطلب فارغة' };
        const prepared = items.map((it) => {
          const p = db.products.find((x) => x.id === Number(it.product_id));
          if (!p) throw { demo: true, status: 422, message: 'أحد المنتجات غير متوفر' };
          const quantity = Number(it.quantity) || 0;
          if (quantity <= 0 || quantity > p.quantity) {
            throw { demo: true, status: 422, message: `الكمية المطلوبة من «${p.name}» غير متوفرة (المتاح: ${p.quantity})` };
          }
          return { product_id: p.id, name: p.name, price: p.price, quantity, total: p.price * quantity };
        });
        const total = prepared.reduce((s, it) => s + it.total, 0);
        db.counters.order++;
        const order = {
          id: db.counters.order, order_no: `ORD-${new Date().getFullYear()}-${String(db.counters.order).padStart(4, '0')}`,
          date: new Date().toISOString(), customer_name: body.customer_name, phone: body.phone,
          address: body.address || '', delivery_method: body.delivery_method || 'pickup',
          notes: body.notes || '', items: prepared, total, status: 'new'
        };
        prepared.forEach((it) => {
          const p = db.products.find((x) => x.id === it.product_id);
          p.quantity -= it.quantity;
        });
        db.orders.push(order);
        this.notify(db, 'order', 'طلب جديد من المتجر', `طلب جديد من ${order.customer_name} بمبلغ ${Helpers.formatNumber(order.total)}`);
        DemoData.save();
        return this.ok('تم استلام طلبك بنجاح، سنتواصل معك قريبًا', order);
      }
    }

    /* ---------- الإشعارات ---------- */
    if (scope === 'notifications') {
      if (method === 'GET') {
        const items = [...db.notifications].sort((a, b) => new Date(b.date) - new Date(a.date));
        return this.ok('تم جلب الإشعارات', {
          items: items.slice(0, 12),
          unread: db.notifications.filter((n) => !n.read).length
        });
      }
      if (method === 'POST') {
        db.notifications.forEach((n) => { n.read = true; });
        DemoData.save();
        return this.ok('تم تحديد كل الإشعارات كمقروءة');
      }
    }

    throw { demo: true, status: 404, message: `المسار غير مدعوم في الوضع التجريبي: ${method} /${clean}` };
  },

  /* ------- أدوات داخلية ------- */

  ok(message, data = null, meta = null) {
    return { success: true, message, data, meta };
  },

  paginate(list, params) {
    const page = Math.max(1, parseInt(params.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(params.per_page, 10) || 10));
    const total = list.length;
    const lastPage = Math.max(1, Math.ceil(total / perPage));
    const current = Math.min(page, lastPage);
    const start = (current - 1) * perPage;
    const sliced = list.slice(start, start + perPage);
    return [sliced, {
      current_page: current,
      last_page: lastPage,
      total,
      per_page: perPage,
      from: total ? start + 1 : 0,
      to: Math.min(start + perPage, total)
    }];
  },

  serializeUser(user, db) {
    return {
      id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role,
      store: {
        name: db.settings.store_name, logo: db.settings.logo || '',
        business_type: db.settings.business_type || ''
      }
    };
  },

  categoryName(db, id) {
    const cat = db.categories.find((c) => c.id === Number(id));
    return cat ? cat.name : '—';
  },

  /* إجماليات مالية لعميل: المشتريات/المدفوع/المتبقي */
  customerTotals(db, customerId) {
    const sales = db.sales.filter((s) => s.customer_id === customerId && s.status !== 'cancelled');
    const purchasesTotal = sales.reduce((s, x) => s + Number(x.total || 0), 0);
    const paidSalesIds = new Set(sales.map((s) => s.id));
    const paid = db.payments
      .filter((p) => p.customer_id === customerId && (p.sale_id === null || paidSalesIds.has(p.sale_id)))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    return {
      purchases_total: Math.round(purchasesTotal * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      remaining: Math.round((purchasesTotal - paid) * 100) / 100
    };
  },

  customerDebt(db) {
    let total = 0;
    db.customers.forEach((c) => { total += this.customerTotals(db, c.id).remaining; });
    return { total: Math.round(total * 100) / 100 };
  },

  supplierTotals(db, supplierId) {
    const list = db.purchases.filter((p) => p.supplier_id === supplierId);
    const purchasesTotal = list.reduce((s, p) => s + Number(p.total || 0), 0);
    const paid = list.reduce((s, p) => s + Number(p.paid || 0), 0);
    return {
      purchases_total: Math.round(purchasesTotal * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      remaining: Math.round((purchasesTotal - paid) * 100) / 100
    };
  },

  supplierDebt(db) {
    let total = 0;
    db.suppliers.forEach((s) => { total += this.supplierTotals(db, s.id).remaining; });
    return { total: Math.round(total * 100) / 100 };
  },

  /* كشف حساب العميل: فواتير (مدين) ودفعات (دائن) برصيد متسلسل */
  buildStatement(db, customerId) {
    const rows = [];
    db.sales.filter((s) => s.customer_id === customerId && s.status !== 'cancelled')
      .forEach((s) => rows.push({ date: s.date, type: 'invoice', label: `فاتورة ${s.invoice_no}`, debit: s.total, credit: 0 }));
    const salesIds = new Set(db.sales.filter((s) => s.customer_id === customerId && s.status !== 'cancelled').map((s) => s.id));
    db.payments.filter((p) => p.customer_id === customerId && (p.sale_id === null || salesIds.has(p.sale_id)))
      .forEach((p) => rows.push({ date: p.date, type: 'payment', label: p.sale_id ? `دفعة على فاتورة` : 'دفعة نقدية', debit: 0, credit: p.amount }));
    rows.sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = 0;
    rows.forEach((r) => { balance += r.debit - r.credit; r.balance = Math.round(balance * 100) / 100; });
    return rows.reverse();
  },

  notify(db, type, title, message) {
    db.notifications.unshift({
      id: Date.now(), type, title, message, read: false, date: new Date().toISOString()
    });
    db.notifications = db.notifications.slice(0, 20);
  }
};

window.DemoData = DemoData;
window.DemoAPI = DemoAPI;
