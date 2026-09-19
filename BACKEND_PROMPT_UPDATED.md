# برومبت بناء Back-end متوافق مع ShopFlow Front-end

أريد منك بناء Back-end احترافي ومتكامل لمشروع **ShopFlow**، وهو نظام SaaS لإدارة المحلات الصغيرة. يجب أن يكون الـ Back-end متوافقًا حرفيًا مع الـ Front-end الموجود في مشروع `shopflow-frontend`، بما في ذلك أسماء المسارات، أسماء الحقول، شكل الاستجابات، المصادقة، الصلاحيات، المتجر الإلكتروني، التقارير، والبيانات التجريبية.

## 1. التقنيات والقيود

استخدم التقنيات التالية:

- PHP Native 8.2 أو أحدث.
- MySQL 8 أو أحدث.
- PDO مع Prepared Statements.
- REST API.
- JSON Responses.
- MVC Architecture مبسطة ومنظمة.
- لا تستخدم Laravel أو Symfony أو أي Framework.
- يجب أن يعمل المشروع على XAMPP وApache.
- يجب دعم CORS بطريقة آمنة للـ Front-end أثناء التطوير فقط.
- يجب استخدام UTF-8 و`utf8mb4` لدعم العربية والإنجليزية.

## 2. هيكل المشروع

أنشئ المشروع بهذا الهيكل:

```text
shopflow-backend/
├── config/
│   ├── database.php
│   └── config.php
├── public/
│   └── index.php
├── app/
│   ├── Controllers/
│   ├── Models/
│   ├── Services/
│   ├── Middleware/
│   ├── Validators/
│   ├── Helpers/
│   └── Routes/
├── database/
│   ├── schema.sql
│   └── seeders.php
├── storage/
│   ├── uploads/products/
│   ├── uploads/stores/
│   └── logs/
├── tests/
└── .htaccess
```

لا تضع كل الكود في `index.php`. استخدم Controllers وModels وServices وValidators وMiddleware منفصلة، مع تعليقات مختصرة على الدوال المهمة.

## 3. شكل الاستجابة الموحد

كل استجابة نجاح يجب أن تكون بهذا الشكل:

```json
{
  "success": true,
  "message": "تم تنفيذ العملية بنجاح",
  "data": {},
  "meta": {}
}
```

كل استجابة خطأ يجب أن تكون بهذا الشكل:

```json
{
  "success": false,
  "message": "البيانات المدخلة غير صحيحة",
  "errors": {}
}
```

استخدم HTTP status codes صحيحة، مثل:

- `200` للنجاح.
- `201` للإنشاء.
- `400` لطلب غير صالح.
- `401` لجلسة منتهية أو بيانات دخول غير صحيحة.
- `403` لعدم الصلاحية.
- `404` للعنصر غير الموجود.
- `409` للتعارض مثل SKU مكرر.
- `422` لفشل التحقق.
- `500` لأخطاء الخادم.

## 4. قاعدة البيانات

أنشئ `database/schema.sql` باستخدام InnoDB وForeign Keys وIndexes مناسبة.

### shops

- `id`
- `name`
- `slug` unique
- `business_type`
- `phone`
- `email`
- `address`
- `logo`
- `currency`
- `tax_rate`
- `created_at`
- `updated_at`

### users

- `id`
- `shop_id`
- `name`
- `email` nullable
- `phone` nullable
- `password`
- `role`
- `status`
- `created_at`
- `updated_at`

الأدوار المدعومة:

- `owner`
- `admin`
- `employee`
- `warehouse`
- `staff`

يجب أن يكون لكل مستخدم محل واحد على الأقل، ولا يجوز استخدام `shop_id` القادم من Front-end. استخرج `shop_id` من المستخدم المصادق عليه.

### categories

- `id`
- `shop_id`
- `name`
- `description` nullable
- `created_at`
- `updated_at`
- `deleted_at` nullable

### products

استخدم أسماء الحقول التالية لأن الـ Front-end يرسلها بهذه الأسماء:

- `id`
- `shop_id`
- `category_id`
- `name`
- `sku`
- `description`
- `image`
- `cost`
- `price`
- `quantity`
- `min_stock`
- `color`
- `size`
- `material`
- `status`
- `created_at`
- `updated_at`
- `deleted_at`

إذا أردت استخدام أسماء قاعدة بيانات مختلفة مثل `purchase_price` و`sale_price` أو `minimum_stock`، يجب عمل Mapping داخلي واضح، مع إبقاء JSON API متوافقًا مع `cost` و`price` و`min_stock`.

يجب فرض Unique على `(shop_id, sku)` عند وجود SKU.

### customers

- `id`
- `shop_id`
- `name`
- `phone`
- `email` nullable
- `address`
- `notes`
- `total_purchases`
- `total_paid`
- `total_due`
- `created_at`
- `updated_at`
- `deleted_at`

### suppliers

- `id`
- `shop_id`
- `name`
- `company` nullable
- `phone`
- `email` nullable
- `address`
- `notes`
- `total_purchases`
- `total_paid`
- `total_due`
- `created_at`
- `updated_at`
- `deleted_at`

### sales

- `id`
- `shop_id`
- `customer_id` nullable
- `user_id`
- `invoice_number`
- `subtotal`
- `discount`
- `tax_rate`
- `tax`
- `total`
- `paid`
- `due`
- `payment_method`
- `status`
- `notes`
- `created_at`
- `updated_at`

### sale_items

- `id`
- `sale_id`
- `product_id`
- `product_name`
- `quantity`
- `purchase_price`
- `sale_price`
- `total`

### purchases و purchase_items

أنشئ جدول `purchases` بالحقول:

- `id`
- `shop_id`
- `supplier_id` nullable
- `user_id`
- `reference_number`
- `subtotal`
- `discount`
- `total`
- `paid`
- `due`
- `status`
- `notes`
- `created_at`
- `updated_at`

وأنشئ `purchase_items` بالحقول:

- `id`
- `purchase_id`
- `product_id`
- `quantity`
- `purchase_price`
- `total`

### payments

- `id`
- `shop_id`
- `customer_id` nullable
- `supplier_id` nullable
- `sale_id` nullable
- `purchase_id` nullable
- `user_id`
- `amount`
- `payment_type`
- `payment_method`
- `payment_date` nullable
- `notes`
- `created_at`

### expenses

- `id`
- `shop_id`
- `user_id`
- `title`
- `category`
- `amount`
- `notes`
- `expense_date`
- `created_at`
- `updated_at`

### stock_movements

- `id`
- `shop_id`
- `product_id`
- `user_id` nullable
- `type`
- `quantity`
- `reference_type`
- `reference_id` nullable
- `notes`
- `created_at`

### notifications

- `id`
- `shop_id`
- `user_id` nullable
- `type`
- `title`
- `message`
- `read_at` nullable
- `created_at`

### store_orders و store_order_items

أنشئ جدولين للطلبات العامة من المتجر:

`store_orders`:

- `id`
- `shop_id`
- `order_number`
- `customer_name`
- `phone`
- `address`
- `delivery_method`
- `notes`
- `subtotal`
- `total`
- `status`
- `created_at`
- `updated_at`

`store_order_items`:

- `id`
- `order_id`
- `product_id`
- `product_name`
- `quantity`
- `price`
- `total`

## 5. المصادقة والجلسات

أنشئ endpoints:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/change-password
```

يدعم الـ Front-end تسجيل الدخول باستخدام `identifier`، لذلك يجب أن يقبل endpoint login البريد الإلكتروني أو رقم الهاتف:

```json
{
  "identifier": "demo@shopflow.com",
  "password": "123456"
}
```

استجب مثلًا بـ:

```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "token": "TOKEN_VALUE",
    "user": {
      "id": 1,
      "shop_id": 1,
      "name": "محمد العلي",
      "email": "demo@shopflow.com",
      "phone": "0500000000",
      "role": "owner",
      "store": {
        "id": 1,
        "name": "متجر الأفق",
        "logo": null
      }
    }
  },
  "meta": {}
}
```

استخدم `password_hash()` و`password_verify()`. لا ترجع كلمة المرور في أي Response. نفّذ Bearer Token أو Sessions، وإذا استخدمت Sessions فأضف CSRF protection.

## 6. Middleware والصلاحيات

أنشئ Middleware للتحقق من:

1. وجود Authorization Bearer Token.
2. صلاحية Token وعدم انتهائه.
3. وجود المستخدم وحالته active.
4. استخراج `shop_id` من المستخدم.
5. منع أي استعلام أو تعديل خارج محل المستخدم.
6. التحقق من الدور قبل العمليات الحساسة.

الصلاحيات المقترحة:

- `owner`: كل الصلاحيات.
- `admin`: الإدارة اليومية والتقارير.
- `employee`: العملاء والمبيعات والمتجر، دون إعدادات حساسة.
- `warehouse`: المنتجات والمخزون والمشتريات.
- `staff`: صلاحيات تشغيلية محدودة.

## 7. فحص الصحة والإعدادات والإشعارات

هذه endpoints مطلوبة من الفرونت:

```text
GET /api/health
GET /api/settings
PUT /api/settings
GET /api/notifications
POST /api/notifications/read-all
```

يجب أن يعيد `/api/health` استجابة نجاح بسيطة حتى يستطيع الفرونت اختيار وضع Live بدل Demo.

حقول settings:

- `store_name`
- `business_type`
- `store_phone`
- `store_email`
- `store_address`
- `currency`
- `tax_rate`
- `logo`

## 8. التصنيفات والمنتجات

أنشئ endpoints التالية، مع دعم `shop_id` الداخلي فقط:

```text
GET    /api/categories
POST   /api/categories
PUT    /api/categories/{id}
DELETE /api/categories/{id}

GET    /api/products
GET    /api/products/{id}
POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}
PUT    /api/products/{id}/stock
```

مهم: الفرونت الحالي يستخدم `PUT /products/{id}/stock`، لذلك يجب دعم هذا المسار. يمكن دعم `POST /products/{id}/adjust-stock` كمسار بديل، لكن لا تستبدل المسار الأول.

`GET /api/products` يجب أن يدعم:

```text
search
category_id
stock_status = in|low|out
page
per_page
```

يجب إعادة `meta` بهذا الشكل عند Pagination:

```json
{
  "current_page": 1,
  "last_page": 3,
  "per_page": 10,
  "total": 28,
  "from": 1,
  "to": 10
}
```

دعم رفع الصور بطريقتين:

1. رابط صورة آمن.
2. Base64 Data URL لأن الفرونت الحالي يحول الصورة المرفوعة إلى Base64.

تحقق من MIME type والحجم والامتداد، واحفظ الملفات خارج المسارات التنفيذية، ولا تسمح برفع PHP أو SVG غير موثوق.

## 9. العملاء والموردون والدفعات

### العملاء

```text
GET    /api/customers
GET    /api/customers/{id}
POST   /api/customers
PUT    /api/customers/{id}
DELETE /api/customers/{id}
GET    /api/customers/{id}/statement
POST   /api/customers/{id}/payments
```

يجب دعم البحث وPagination. Endpoint الدفعات يجب أن يقبل:

```json
{
  "amount": 100,
  "method": "cash",
  "date": "2026-09-17",
  "notes": "دفعة نقدية"
}
```

### الموردون

```text
GET    /api/suppliers
GET    /api/suppliers/{id}
POST   /api/suppliers
PUT    /api/suppliers/{id}
DELETE /api/suppliers/{id}
GET    /api/suppliers/{id}/statement
POST   /api/suppliers/{id}/payments
```

يجب دعم `payment_method` أو `method` كاسمين متوافقين عند الحاجة، وإرجاع البيانات بصيغة موحدة.

## 10. المبيعات والفواتير

أنشئ endpoints التالية:

```text
GET    /api/sales
GET    /api/sales/{id}
POST   /api/sales
PUT    /api/sales/{id}/cancel
POST   /api/sales/{id}/payments
GET    /api/sales/{id}/invoice
GET    /api/sales/{id}/pdf
```

يجب دعم البحث والتصفية:

```text
search
from
 to
status
page
per_page
```

بيانات إنشاء الفاتورة المتوقعة:

```json
{
  "customer_id": 1,
  "payment_method": "cash",
  "discount": 0,
  "tax_rate": 15,
  "paid": 100,
  "notes": "ملاحظة",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 45
    }
  ]
}
```

عند إنشاء الفاتورة:

1. تحقق من الحقول.
2. تحقق من أن كل منتج يتبع للمحل نفسه.
3. استخدم `SELECT ... FOR UPDATE` على المخزون داخل Transaction.
4. امنع الكمية الأكبر من المخزون.
5. احسب subtotal والخصم والضريبة والإجمالي على الخادم.
6. لا تثق في الأسعار أو الإجماليات القادمة من Front-end.
7. احسب paid وdue.
8. أنشئ sale وsale_items.
9. اخصم المخزون.
10. أنشئ stock_movements.
11. حدّث رصيد العميل.
12. أنشئ notification عند الحاجة.
13. أعد invoice number والبيانات الكاملة.

عند الإلغاء:

- لا تسمح بإلغاء الفاتورة مرتين.
- غيّر status إلى `cancelled`.
- أعد الكميات إلى المخزون.
- أنشئ حركة عكسية.
- حدّث أرصدة العميل.
- نفّذ كل ذلك داخل Transaction.

يجب أن يعيد `/api/sales/{id}/pdf` ملف PDF فعليًا مع `Content-Type: application/pdf` أو يعيد رابط تحميل آمن.

## 11. المشتريات

أنشئ:

```text
GET    /api/purchases
GET    /api/purchases/{id}
POST   /api/purchases
PUT    /api/purchases/{id}/cancel
POST   /api/purchases/{id}/payments
```

عند تسجيل شراء:

- تحقق من المورد والمنتجات داخل المحل.
- زد المخزون.
- حدّث سعر الشراء عند الحاجة.
- أنشئ stock movement.
- حدّث رصيد المورد.
- استخدم Transaction.

## 12. المصروفات والتقارير

### المصروفات

```text
GET    /api/expenses
POST   /api/expenses
PUT    /api/expenses/{id}
DELETE /api/expenses/{id}
```

### لوحة التحكم

```text
GET /api/dashboard
```

أعد على الأقل:

- مبيعات اليوم.
- مبيعات الشهر.
- صافي الأرباح.
- عدد المنتجات.
- المنتجات منخفضة المخزون.
- ديون العملاء.
- ديون الموردين.
- بيانات Chart.js لمبيعات آخر 14 يومًا.
- آخر الفواتير.

### التقارير

الفرونت الحالي يستخدم أسماء التقارير التالية، لذلك ادعمها كما هي:

```text
GET /api/reports/sales
GET /api/reports/profit
GET /api/reports/inventory
GET /api/reports/top-products
GET /api/reports/debts
GET /api/reports/expenses
```

يمكن دعم `/api/reports/profits` كـ alias، لكن المسار الأساسي يجب أن يكون `/profit`.

كل تقرير يجب أن يدعم:

```text
from
 to
```

أعد بيانات مناسبة للـ Cards والجداول والرسوم البيانية، مثل:

- إجمالي المبيعات.
- إجمالي التكلفة.
- إجمالي الأرباح.
- إجمالي المصروفات.
- صافي الأرباح.
- المنتجات الأكثر مبيعًا.
- المخزون المنخفض.
- ديون العملاء والموردين.

## 13. المتجر الإلكتروني العام

هذه المسارات لا تحتاج إلى تسجيل دخول، لكنها يجب أن تعرض منتجات محل محدد فقط بطريقة آمنة:

```text
GET  /api/store/products
POST /api/store/orders
```

يدعم `GET /api/store/products`:

```text
search
category_id
page
per_page
```

يجب إعادة اسم المتجر وشعاره والتصنيف ضمن الاستجابة أو من خلال settings عامة مرتبطة بالمحل.

بيانات إنشاء الطلب:

```json
{
  "customer_name": "أحمد محمد",
  "phone": "0500000000",
  "address": "الرياض - حي النخيل",
  "delivery_method": "delivery",
  "notes": "الاتصال قبل التوصيل",
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ]
}
```

يجب إعادة التحقق من الأسعار والمخزون على الخادم، ومنع التلاعب بالمتجر أو إرسال `shop_id` غير مصرح به. إذا احتاج النظام إلى تحديد محل المتجر العام، استخدم slug أو إعدادًا آمنًا في الـ URL أو الخادم، وليس قيمة يثق بها الخادم مباشرة.

## 14. الأمان

- استخدم PDO Prepared Statements في كل الاستعلامات.
- لا تستخدم SQL string concatenation مع مدخلات المستخدم.
- تحقق من كل المدخلات على الخادم.
- لا تثق في أي حسابات مالية من Front-end.
- طبّق عزل المحلات في كل Query.
- استخدم Soft Delete حيث يلزم.
- امنع SQL Injection وXSS وIDOR.
- امنع رفع الملفات الخطيرة.
- لا تعرض Stack Traces أو أخطاء قاعدة البيانات للمستخدم.
- خزّن الأخطاء في `storage/logs`.
- أضف Rate Limiting لتسجيل الدخول والطلبات العامة.
- استخدم CORS بقائمة Origins محددة في بيئة الإنتاج.
- لا تُرجع كلمات المرور أو الأسرار أو Tokens غير الضرورية.
- استخدم CSRF عند الاعتماد على Sessions.
- أضف Transaction لكل عملية تؤثر على المال أو المخزون.

## 15. Seeder وبيانات الاختبار

أنشئ `database/seeders.php` ببيانات تجريبية:

```text
البريد: demo@shopflow.com
كلمة المرور: 123456
```

أنشئ متجرًا تجريبيًا، وتصنيفات، ومنتجات، وعملاء، وموردين، وفواتير، ومصروفات، وحركات مخزون.

يجب ألا تحتوي أي استجابة مستخدم على حقل password.

## 16. الاختبارات والتوثيق

أنشئ اختبارات API تغطي:

- Register وLogin و401.
- عزل محل عن محل آخر.
- CRUD المنتجات والتصنيفات.
- منع SKU المكرر.
- منع بيع كمية أكبر من المخزون.
- إنشاء فاتورة داخل Transaction.
- إلغاء الفاتورة مرة واحدة فقط.
- تسجيل دفعات العملاء والموردين.
- التقارير والتواريخ.
- الطلبات العامة من المتجر.
- رفع الصور والتحقق من الملفات.

اكتب `README.md` يشرح:

1. متطلبات التشغيل.
2. إنشاء قاعدة البيانات من `schema.sql`.
3. تعديل بيانات MySQL.
4. تشغيل المشروع على XAMPP وApache.
5. عنوان API الذي يجب وضعه في الفرونت، مثل:

```text
http://localhost/Project_php/shopflow-backend/public
```

6. بيانات الدخول التجريبية.
7. جميع endpoints.
8. أمثلة JSON للطلبات والاستجابات.
9. طريقة اختبار `/api/health`.
10. طريقة اختبار Bearer Token.
11. طريقة ربط رفع الصور وPDF بالفرونت.

ابدأ التنفيذ بهذا الترتيب:

1. `schema.sql`.
2. Config وPDO.
3. Router وResponse Helper.
4. Authentication وMiddleware.
5. Shops وSettings.
6. Categories وProducts.
7. Customers وSuppliers وPayments.
8. Sales وInventory Transactions.
9. Purchases وExpenses.
10. Dashboard وReports.
11. Public Store وOrders.
12. PDF وUploads وNotifications.
13. Seeders.
14. اختبارات API.
15. README.

قبل إنهاء التنفيذ، اختبر أن كل المسارات أعلاه متوافقة مع `shopflow-frontend`، خصوصًا:

- `/api/products/{id}/stock`
- `/api/customers/{id}/payments`
- `/api/suppliers/{id}/payments`
- `/api/sales/{id}/payments`
- `/api/reports/profit`
- `/api/settings`
- `/api/notifications/read-all`
- `/api/store/products`
- `/api/store/orders`
- `/api/health`

لا تغيّر أسماء هذه المسارات دون توفير Alias متوافق معها.

**المطلوب النهائي:** اكتب كل الملفات كاملة مع مساراتها ومحتواها، ولا تكتفِ بشرح عام أو Pseudocode.
