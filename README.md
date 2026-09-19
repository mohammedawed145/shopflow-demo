# ShopFlow — نظام إدارة المحلات (الواجهة الأمامية)

واجهة أمامية احترافية كاملة لنظام **ShopFlow** لإدارة المحلات، مبنية بـ **HTML5 + CSS3 + JavaScript (ES6) + Bootstrap 5** بدون أي Framework ثقيل (لا React ولا Vue)، بدعم كامل للغة العربية واتجاه **RTL**، وتصميم **Responsive** يعمل على الجوال والأجهزة اللوحية والشاشات الكبيرة.

---

## 1) هيكل المشروع

```
shopflow-frontend/
├── index.html              # صفحة البداية (توجيه تلقائي)
├── login.html              # تسجيل الدخول
├── register.html           # إنشاء حساب جديد
├── forgot-password.html    # استعادة كلمة المرور
├── dashboard.html          # لوحة التحكم (إحصائيات + Chart.js)
├── products.html           # قائمة المنتجات (بحث/فلترة/ترقيم)
├── product-form.html       # إضافة/تعديل منتج
├── categories.html         # التصنيفات
├── customers.html          # العملاء + سداد الديون
├── customer-details.html   # كشف حساب عميل
├── suppliers.html          # الموردون + سداد المستحقات
├── sales.html              # قائمة المبيعات والفواتير
├── create-sale.html        # إنشاء فاتورة بيع جديدة
├── sale-details.html       # تفاصيل الفاتورة (طباعة/PDF)
├── purchases.html          # فواتير المشتريات
├── expenses.html           # المصروفات
├── reports.html            # التقارير (6 تقارير + Charts + CSV)
├── settings.html           # إعدادات المتجر والاتصال
├── store.html              # المتجر الإلكتروني (صفحة عامة)
├── cart.html               # سلة المشتريات
├── checkout.html           # إتمام الطلب
├── assets/
│   ├── css/style.css       # نظام التصميم الكامل (RTL)
│   ├── css/responsive.css  # تجاوب الشاشات (جوال/تابلت)
│   ├── images/logo.svg     # شعار ShopFlow
│   └── js/
│       ├── helpers.js      # دوال مساعدة (تنسيق، تحقق، XSS، CSV)
│       ├── api.js          # طبقة REST API (Fetch + Token)
│       ├── auth.js         # الجلسات وتسجيل الدخول
│       ├── components.js   # مكونات مشتركة (Sidebar/Navbar/Toasts...)
│       ├── demo-data.js    # بيانات تجريبية + API محاكي (احتياطي)
│       ├── dashboard.js / products.js / customers.js
│       ├── sales.js / purchases.js / expenses.js
│       ├── reports.js / settings.js / store.js
└── README.md
```

---

## 2) طريقة التشغيل

### عبر XAMPP (موصى به)
1. ضع مجلد `shopflow-frontend` داخل `htdocs` (هو موجود حاليًا في `E:\xampp\htdocs\Project_php\`).
2. شغّل **Apache** من لوحة XAMPP.
3. افتح المتصفح على:
   ```
   http://localhost/Project_php/shopflow-frontend/
   ```

### بدون خادم محلي (بديل)
```bash
cd shopflow-frontend
python -m http.server 8080
# ثم افتح http://localhost:8080
```
> ملاحظة: فتح الملفات مباشرة عبر `file://` غير مدعوم (الـ Fetch API يمنع طلبات الملفات المحلية).

### تسجيل الدخول التجريبي
```
البريد: demo@shopflow.com
كلمة المرور: 123456
```

---

## 3) وضع التشغيل: تلقائي / مباشر / تجريبي

يعمل المشروع بثلاثة أوضاع، ويُدار من **settings.html ← بطاقة «الاتصال بالـ Back-end»**:

| الوضع | السلوك |
|---|---|
| **تلقائي (auto)** — الافتراضي | عند أول طلب يُفحص `GET {API_BASE_URL}/health`؛ إن استجاب الخادم تُستخدم الـ API الحقيقية مباشرة، وإلا يتحول تلقائيًا للبيانات التجريبية المحلية حتى لا تتعطل الواجهة |
| **مباشر (live)** | اتصال بالـ Back-end فقط (أي فشل يظهر كرسالة خطأ عربية) |
| **تجريبي (demo)** | بيانات محلية كاملة في `localStorage` بدون أي خادم — مثالي للعرض والتجربة |

- في الوضع التجريبي تظهر شارة **«وضع تجريبي»** في الشريط العلوي، ويمكن **إعادة تعيين البيانات** من صفحة الإعدادات.
- البيانات التجريبية مؤقتة فقط: بمجرد جاهزية الـ Back-end وحصول الفحص على استجابة، تعمل كل الصفحات على الـ API الحقيقية تلقائيًا دون أي تعديل.

---

## 4) تعديل عنوان الـ API (API_BASE_URL)

ثلاث طرق:

1. **من صفحة الإعدادات** (الأسهل): `settings.html` ← «الاتصال بالـ Back-end» ← أدخل العنوان ← «اختبار الاتصال» ← «حفظ».
2. **تعديل القيمة الافتراضية في الكود**: افتح `assets/js/api.js`:
   ```js
   const API_DEFAULT_BASE = '../shopflow-backend/public/api'; // عدّلها إلى عنوانك
   ```
   أمثلة:
   - API على نفس النطاق: `'../shopflow-backend/public/api'` (يتصل بـ `http://localhost/Project_php/shopflow-backend/public/api/...`)
   - خادم منفصل: `'http://localhost:8000/api'`
3. **مفتاح في المتصفح** (بدون تعديل الكود):
   ```js
   localStorage.setItem('shopflow_api_base', 'http://localhost:8000/api');
   ```

---

## 5) الربط بالـ Back-end (عقد الـ API)

كل الطلبات تمر عبر `Api` في `assets/js/api.js` باستخدام **Fetch** مع:

- ترويسة `Authorization: Bearer {token}` تلقائيًا لكل طلب محمي.
- ترويسات `Content-Type: application/json` / `Accept: application/json`.
- معالجة **401** بإعادة التوجيه إلى `login.html?expired=1`.
- مهلة زمنية 20 ثانية لكل طلب (AbortController).
- **صيغة الاستجابة الموحدة** المتوقعة من الخادم:
  ```json
  {
    "success": true,
    "message": "تم التنفيذ بنجاح",
    "data": {},
    "meta": { "current_page": 1, "last_page": 3, "total": 28 }
  }
  ```

### أهم نقاط النهاية (Endpoints)

| الميزة | الطريقة والمسار |
|---|---|
| تسجيل الدخول | `POST /auth/login` |
| إنشاء حساب | `POST /auth/register` |
| استعادة كلمة المرور | `POST /auth/forgot-password` |
| تغيير كلمة المرور | `POST /auth/change-password` |
| لوحة التحكم | `GET /dashboard` |
| المنتجات | `GET/POST /products` · `PUT/DELETE /products/{id}` · `PUT /products/{id}/stock` |
| التصنيفات | `GET/POST /categories` · `PUT/DELETE /categories/{id}` |
| العملاء | `GET/POST /customers` · `PUT/DELETE /customers/{id}` · `POST /customers/{id}/payments` |
| الموردون | `GET/POST /suppliers` · `PUT/DELETE /suppliers/{id}` · `POST /suppliers/{id}/payments` |
| المبيعات | `GET/POST /sales` · `GET /sales/{id}` · `PUT /sales/{id}/cancel` · `POST /sales/{id}/payments` |
| المشتريات | `GET/POST /purchases` · `DELETE /purchases/{id}` |
| المصروفات | `GET/POST /expenses` · `PUT/DELETE /expenses/{id}` |
| التقارير | `GET /reports/{sales,profit,inventory,top-products,debts,expenses}` |
| الإعدادات | `GET/PUT /settings` |
| المتجر العام | `GET /store/products` · `POST /store/orders` |
| الإشعارات | `GET /notifications` · `POST /notifications` (read-all) |
| فحص الجاهزية | `GET /health` |

> المسارات نسبية لـ `API_BASE_URL`. عند وضع الـ API في نفس نطاق الواجهة، اجعل مجلد الـ API بجوار `shopflow-frontend` تحت المسار `/api`.

---

## 6) الأمان والتحقق (مهم لفريق الـ Back-end)

- **الحماية من XSS**: كل بيانات الـ API تُعرض عبر `Helpers.escapeHtml()` قبل إدراجها في `innerHTML`.
- **الصلاحيات**: إخفاء عناصر الواجهة حسب الدور عبر `data-roles="owner,admin"` — وهذا إخفاء تجميلي فقط؛ **التحقق الحقيقي من الصلاحيات مسؤولية الـ Back-end** (403).
- **الجلسة**: `token + user` في `localStorage` (تذكرني) أو `sessionStorage`، مع قائمة سماح لمعامل `?redirect=` لمنع Open Redirect.
- **التحقق من المدخلات**: قواعد `data-validate` عربية على كل النماذج قبل الإرسال، والـ Back-end يجب أن يعيد 422 برسالة عربية عند فشل التحقق.
- **قيود المخزون**: الحد الأقصى للكمية في الفواتير يُطبق في الواجهة، ويجب أيضًا التحقق منه في الخادم.

---

## 7) دليل الاختبار السريع

1. **تسجيل الدخول**: `login.html` ← زر «استخدام بيانات تجريبية» ثم «تسجيل الدخول».
2. **لوحة التحكم**: تحقق من بطاقات الإحصائيات + مخطط مبيعات آخر 14 يومًا + جدولي قليلي المخزون وآخر الفواتير.
3. **المنتجات**: ابحث، فلتر بالتصنيف/المخزون، عدّل الكمية من أيقونة المخزون، أضف منتجًا جديدًا من `product-form.html` (جرب رفع صورة من الجهاز).
4. **إنشاء فاتورة**: `create-sale.html` ← ابحث عن منتج وأضفه (جرب إضافة نفس المنتج مرتين: تزداد الكمية بدل التكرار) ← اختر عميلًا ← طبّق خصمًا وضريبة ← احفظ ← اطبع الفاتورة.
5. **العملاء**: افتح تفاصيل عميل مدين ← سجّل دفعة ← اطبع كشف الحساب.
6. **التقارير**: تنقل بين التبواب الستة، غيّر الفترة الزمنية، صدّر CSV وافتحه في Excel، وجرّب «طباعة / PDF».
7. **المتجر الإلكتروني**: افتح `store.html` (بدون تسجيل دخول) ← أضف منتجات للسلة ← عدّل الكميات في `cart.html` ← أكمل الطلب في `checkout.html` ← سجّل الدخول وسترى إشعار «طلب جديد» وخصم المخزون.
8. **الإعدادات**: غيّر اسم المتجر والعملة ← تحقق من انعكاسهما في كل الصفحات ← جرّب «اختبار الاتصال» و«إعادة تعيين البيانات التجريبية».
9. **تجاوب التصميم**: صغّر نافذة المتصفح — القائمة الجانبية تتحول لقائمة منسدلة عبر زر الهامبرغر والجداول قابلة للتمرير أفقيًا.

---

## 8) مكتبات خارجية (CDN)

- Bootstrap 5.3.3 (نسخة RTL) + Bootstrap Icons 1.11.3
- خط Cairo من Google Fonts
- Chart.js 4.4.3 (لوحة التحكم والتقارير)

© 2026 ShopFlow
