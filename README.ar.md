# LeaxPanel(os)

**استضف أي شيء. أدر كل شيء. انشر في أي مكان.**

منصة **نظام تشغيل سحابي كامل** مبنية بلغة JavaScript خالصة — Node.js 22+، Express، EJS، Socket.IO و SQLite.
بدون أي خطوة بناء. بدون TypeScript. بدون React أو Vue. بدون الحاجة إلى Docker أو PostgreSQL أو Redis أو MinIO.

> من إنشاء وتنظيم **Bilal Chentouf (NetBlood)** — تطوير بمساعدة الذكاء الاصطناعي.

---

## الفهرس

- [التثبيت بأمر واحد](#التثبيت-بأمر-واحد)
- [التشغيل السريع](#التشغيل-السريع)
- [التثبيت اليدوي](#التثبيت- اليدوي)
- [بيانات الدخول الافتراضية](#بيانات-الدخول-الافتراضية)
- [نظرة على الميزات](#نظرة-على-الميزات)
- [البنية التقنية](#البنية-التقنية)
- [الأوامر](#الأوامر)
- [واجهة REST API](#واجهة-rest-api)
- [الأدوار والصلاحيات](#الأدوار-والصلاحيات)
- [LeaxPanel Doctor](#leaxpanel-doctor)
- [حل المشكلات](#حل-المشكلات)
- [الروابط](#الروابط)
- [الترخيص](#الترخيص)

---

## التثبيت بأمر واحد

المثبِّت يتكفَّل بكلِّ شيء: فحص Node.js، توليد الأسرار، تثبيت الحزم، الترحيلات، البذور، إنشاء المسؤول والتحقق.

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.sh | bash
```

التثبيت التلقائي يقوم بما يلي:
- [OK] التحقق من تشغيل Node.js 22+
- [OK] تثبيت dependencies (npm install)
- [OK] تطبيق migrations قاعدة البيانات
- [OK] seeding المسؤول والإدارات
- [OK] ضبط firewall منافذ TCP 3000
- [OK] توليد شهادات SSL
- [OK] إنشاء مستخدم المشرف بكلمة مرور مولّدة تلقائياً
- [OK] تشغيل panel

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.bat | iex
```

### Windows (نقرة مزدوجة)

تحميل [`install.bat`](https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.bat) وتشغيلها.

---

## التشغيل السريع

1. شغل المثبِّت (`install.bat`، `install.sh` أو الأمر أعلاه).
2. شغل panel: `run.bat`، `./run.sh` أو `npm start`.
3. افتح **http://localhost:3000** في متصفحك.
4. سجِّل دخول بالمصادقة التي طبَّقها المثبِّت.
5. اختياريَّ شغل **مباشر الإعداد** على http://localhost:3000/setup.

---

## التثبيت اليدوي

```bash
git clone https://github.com/netblood/LeaxPanel-OS-.git
cd LeaxPanel-OS-

npm install                 # dependencies
cp .env.example .env        # ثم عِّد الأسرار
npm run migrate             # إنشِّم Schema SQLite
npm run seed                # الأدوار، الصلاحيات، المسؤول
npm start                   # http://localhost:3000
```

المطلَّب: **Node.js 22+** و **npm 10+**. لا شيء آخر.

---

## بيانات الدخول الافتراضية

| الحقل | القيمة |
| --- | --- |
| البريد الإلكتروني | `owner@leaxos.local` |
| كلمة المرور | مولَّدة أثناء التثبيت (طالع `INSTALL_CREDENTIALS.txt`) |

يمكنك Override بها باستعمال متغيرات البيئة `ADMIN_EMAIL` / `ADMIN_PASSWORD` قبل تشغيل المثبِّت.

---

## جولة المميزات

### لوحة التحكم

توفِّر لوحة التحكم المعاد تصميمها ما يلي:

- **نظرةoverview على النظام**: إجمالي المواقع، التطبيقات، البوتات، ورش العمل، وكلاء الذكاء الاصطناعي، النطاقات، المستخدمين، قواعد البيانات
- **Status البنية التحتية**: CPU، RAM، قرص، نطاق ترددي، نسخ احتياطي، درجة الأمان
- **Section الإنشاء السريع**: أزرار عمل明显可见 لإنشاء فوري
- **Service Cards**: بطاقات جميلة لكل فئة خدمة
- **Visual Status**: مؤشرات حالة في كل مكان (أخضر/أصفر/أحمر/غير متصل)
- **Service Wizards**: وأدوات النشر على خطوات
- **Auto Setup**: الإعداد التلقائي: اكتشاف نظام التشغيل، توليد التجهيزات، إنشاء المجلدات، monitoring، النسخ الاحتياطي، الصلاحيات

### فئات الخدمات

استضافة ويب:
- NodeJS Hosting
- PHP Hosting
- WordPress Hosting
- WooCommerce Hosting

استضافة تيليجرام:
- création et gestion de bots Telegram

استضافة ديسكورد:
- création et gestion de bots Discord

استضافة واتساب:
- création d’instance WhatsApp

استضافة N8N:
- automatisation de workflows N8N

استضافة AI:
- déploiement et gestion d’agents AI

استضافة بيانات:
- création et gestion de bases données

استضافة بريد إلكتروني:
- configuration SMTP et gestion

استضافة تخزين:
- gestion de fichiers et sauvegardات

تحتوي كل بطاقة على: تثبيت، إدارة، إحصائيات، وثائق

### أزرار الإنشاء السريع

أزرار عمل visible prominently في لوحة التحكم:

- + إنشاء موقع
- + WordPress
- + WooCommerce
- + تطبيق NodeJS
- + تطبيق PHP
- + بوت تيليجرام
- + بوت ديسكورد
- + واتساب
- + وكيل AI
- + N8N Workflow
- + قاعدة بيانات
- + نطاق
- + بريد إلكتروني
- + نسخة احتياطية

### أدوات النWizard

يستخدم كل نشر Wizard بسيط. Prime example: Create Discord Bot

- **الخطوة 1**: اسم
- **الخطوة 2**: توكن
- **الخطوة 3**: dépôt
- **الخطوة 4**: Deploy
- **Done**.

### الإعداد التلقائي والتشغيل الآلي

يجب أن يقوم LeaxPanel بما يلي تلقائياً:
- اكتشاف System التشغيل
- اكتشاف NodeJS
- اكتشاف PM2
- اكتشاف Nginx
- اكتشاف Firewall
- اكتشاف منافذ متوفرة
- توليد SSL
- توليد التجهيزات
- إنشاء مجلدات
- Generate Logs
- Setup Monitoring
- Setup Backups
- Configure Permissions

لا ينبغي على المستخدمين أداء المهام يدويّة لنظام Linux.

---

## إدارة الوحدات

يجب أن يكون كل موقع/تطبيق/بوت قابل للإدارة من خلال الواجهة مع:

- **Overview** - حالة الخدمة والإحصائيات
- **Files** - مدير الملفات
- **Domains** - إدارة النطاقات و SSL
- **DNS** - Configuration DNS
- **SSL** - إدارة شهادات SSL
- **Logs** - سجلات الوصول والأخطاء
- **Backups** - creation and restoration of backups
- **Analytics** - تحليلات الاستخدام
- **Restart** - إعادة تشغيل الخدمة
- **Update** - تحديث الخدمة
- **Clone** - نسخ الخدمة
- **Delete** - حذف الخدمة
- **Permissions** - التحكم في الوصول
- **Settings** - إعدادات الخدمة المحددة

### مؤشرات حالة العرض

كل شيء لديه مؤشرات حالة:
- **أخضر** - يعمل
- **أصفر** - تنبيه
- **أحمر** - غير متصل
- **رمادي** - غير معروف

المثبّت يتكفّل بكل شيء: فحص Node.js، توليد الأسرار، تثبيت الحزم، الترحيلات، البذور والتحقق.

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.ps1 | iex
```

### Windows (نقرة مزدوجة)

حمّل [`install.bat`](https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.bat) وشغّله.

### من نسخة GitHub

```bash
git clone https://github.com/netblood/LeaxPanel-OS-.git
cd LeaxPanel-OS-

# Linux / macOS
chmod +x install.sh run.sh
./install.sh
./run.sh

# Windows
install.bat
run.bat
```

**ما ينفّذه المثبّت تلقائياً:**

| الخطوة | الإجراء |
| --- | --- |
| 1 | التحقق من Node.js 22+ و npm |
| 2 | فتح المنفذ 3000 في الجدار الناري (ufw / firewalld / netsh) |
| 3 | توليد `SESSION_SECRET` و `JWT_SECRET` و `ENCRYPTION_KEY` وكلمة مرور المدير |
| 4 | تثبيت حزم npm |
| 5 | تطبيق كل ترحيلات قاعدة البيانات |
| 6 | زرع الأدوار والصلاحيات وحساب المدير |
| 7 | تشغيل فحوص التحقق وطباعة بيانات الدخول |

تُحفظ بيانات الدخول أيضاً في ملف `INSTALL_CREDENTIALS.txt`.

---

## التشغيل السريع

1. شغّل المثبّت (`install.bat` أو `install.sh` أو الأمر المباشر أعلاه).
2. شغّل اللوحة: `run.bat` أو `./run.sh` أو `npm start`.
3. افتح **http://localhost:3000** في المتصفح.
4. سجّل الدخول بالبيانات التي عرضها المثبّت.
5. اختيارياً: شغّل **معالج الإعداد** على http://localhost:3000/setup.

---

## التثبيت اليدوي

```bash
git clone https://github.com/netblood/LeaxPanel-OS-.git
cd LeaxPanel-OS-

npm install                 # الحزم
cp .env.example .env        # ثم عدّل الأسرار
npm run migrate             # إنشاء مخطط SQLite
npm run seed                # الأدوار والصلاحيات والمدير
npm start                   # http://localhost:3000
```

المتطلبات: **Node.js 22+** و **npm 10+** فقط.

---

## بيانات الدخول الافتراضية

| الحقل | القيمة |
| --- | --- |
| البريد | `owner@leaxos.local` |
| كلمة المرور | `Leaxos2024!` (غيّرها بعد أول تسجيل دخول) |

المثبّت يستبدلها بكلمة مرور عشوائية قوية ويطبعها. يمكنك تجاوزها عبر متغيّرَي
`ADMIN_EMAIL` و `ADMIN_PASSWORD` قبل تشغيل المثبّت.

---

## نظرة على الميزات

### نظرة عامة
- **لوحة التحكم** — المعالج والذاكرة والقرص والشبكة، عدّادات مباشرة، رسوم بيانية، آخر السجلات والنسخ الاحتياطية والنشاط، صحة الخادم، درجة الأمان وإجراءات سريعة.
- **المراقبة** — قياس لحظي، واجهات الشبكة، تاريخ المقاييس، ونقطة JSON.
- **النسخ الاحتياطية** — لقطات يدوية ومجدولة، نقاط استعادة، تراجع، وملفات manifest على القرص.

### البنية التحتية
- **النطاقات و DNS** — نطاقات، سجلات DNS، شهادات SSL، مناطق Cloudflare.
- **المواقع** — ثابتة، NodeJS، PHP، WordPress، و Proxy.
- **التطبيقات** — نشر NodeJS / PHP / WordPress / Docker مع أوامر PM2 ومتغيرات البيئة والمنافذ والنطاقات.
- **مدير الملفات** — رفع، تنزيل، تحرير مع تلوين بناء الجملة، إعادة تسمية، نقل، حذف، إنشاء مجلدات، ZIP وفك الضغط.
- **التخزين** — حاويات للملفات والوسائط.

### التطبيقات والروبوتات
- **N8N Workflows** — تعريفات سير العمل والحالة.
- **Telegram / Discord / WhatsApp** — نشر الروبوتات والرموز والأرقام.
- **كل الروبوتات** — عرض موحّد.

### الذكاء الاصطناعي
- **وكلاء AI** — دعم، DevOps، أمن، تسويق، مبيعات وبرمجة.
- **مزودو AI** — إعداد لكل مستخدم: OpenAI، Claude، Gemini، OpenRouter، DeepSeek، Mistral، Grok، Ollama أو أي واجهة متوافقة مع OpenAI. الرابط الأساسي، المفتاح (مشفّر AES-256-GCM)، النموذج، موجّه النظام، درجة الحرارة وعدد التوكنات.
- **استضافة AI** — نقاط استدلال ونماذج مستضافة.
- **قواعد المعرفة** — ربط المستندات بالوكلاء.

### البيانات والخدمات
- **قواعد البيانات** — SQLite و PostgreSQL و MySQL و MongoDB و Redis.
- **البريد** — صناديق ومزوّدون وإعدادات SMTP/IMAP.
- **التواصل** — قنوات بريد ورسائل وويب هوك ودفع.
- **Cloudflare** — مناطق، DNS، SSL، تخزين مؤقت وقواعد جدار ناري.

### الأعمال
- **طلبات الخدمة** — يطلب العميل خدمة، يراجعها المدير ويزوّدها.
- **الفوترة** — **معطّلة افتراضياً**. يمكن للمالك تفعيل Stripe أو PayPal أو الفوترة اليدوية من الإعدادات. أثناء التعطيل يُستخدم نظام الطلبات فقط.
- **المتجر** — قوالب وخدمات قابلة للنشر.

### الإدارة
- **المستخدمون** — حسابات، أدوار، تفعيل، إعادة تعيين كلمة المرور.
- **الأدوار والصلاحيات** — تسعة أدوار و 45 صلاحية دقيقة مع مصفوفة ظاهرة.
- **الأمان** — درجة أمان، سجل تدقيق، أحداث أمنية، قوائم IP، تحديد المعدل و 2FA.
- **العلامة البيضاء** — اسم اللوحة والشعار والألوان والنطاق والتذييل.
- **المنصة** — مفاتيح إعداد منخفضة المستوى.
- **الإعدادات** — العلامة التجارية والتسجيل والفوترة وضع الصيانة.
- **مفاتيح API** — مفاتيح نطاق مع تحليلات استخدام.
- **الإشعارات** — تغذية أحداث داخل اللوحة.
- **ملفي الشخصي** — البيانات وكلمة المرور و 2FA ومزودو AI.
- **LeaxPanel Doctor** — 12 فحصاً صحياً مع إصلاح تلقائي بنقرة واحدة.

---

## البنية التقنية

| الطبقة | الاختيار |
| --- | --- |
| التشغيل | Node.js 22+ |
| الإطار | Express.js 4 |
| القوالب | EJS 3 + express-ejs-layouts |
| قاعدة البيانات | SQLite عبر better-sqlite3 (WAL، المفاتيح الأجنبية مفعّلة) |
| اللحظية | Socket.IO 4 |
| المصادقة | bcryptjs، express-session، csurf، speakeasy (TOTP)، jsonwebtoken |
| الأمان | helmet، express-rate-limit، cors |
| السجلات | winston، morgan |
| المهام | node-cron |
| الرفع | multer |
| مدير العمليات | PM2 (اختياري) |

---

## الأوامر

| الأمر | الوصف |
| --- | --- |
| `npm start` | تشغيل اللوحة |
| `npm run dev` | تشغيل في وضع التطوير |
| `npm run migrate` | تطبيق الترحيلات المعلّقة |
| `npm run seed` | زرع الأدوار والصلاحيات والمدير |
| `npm run pm2` | التشغيل تحت PM2 |
| `npm run pm2:logs` | متابعة السجلات |
| `npm run pm2:stop` | إيقاف PM2 |
| `npm run verify` | فحوص ما بعد التثبيت |
| `npm run doctor` | تشخيص من سطر الأوامر |
| `npm run crawl` | فحص كل المسارات وكشف 404 و 500 |
| `npm run generate:views` | إعادة توليد الوحدات |

---

## واجهة REST API

كل الموارد متاحة بصيغة JSON تحت `/api`، مع مصادقة عبر مفتاح API في ترويسة `X-API-Key`.

```bash
curl -H "X-API-Key: lx_..." http://localhost:3000/api/stats
curl -H "X-API-Key: lx_..." "http://localhost:3000/api/apps?limit=10"
```

المصادقة: 120 طلب/دقيقة للـ API، 10 محاولات دخول كل 15 دقيقة (تُستثنى المحاولات الناجحة)،
و 60 عملية كتابة/دقيقة.

التفاصيل الكاملة في [docs/API.md](docs/API.md).

---

## الأدوار والصلاحيات

| الدور | المستوى | الغرض |
| --- | --- | --- |
| `owner` | 100 | وصول كامل |
| `admin` | 90 | كل شيء عدا إدارة النظام |
| `reseller` | 80 | بيع وإدارة الخدمات |
| `manager` | 70 | إدارة الخدمات والمستخدمين |
| `developer` | 60 | نشر وإدارة التطبيقات |
| `support` | 50 | معالجة طلبات الدعم |
| `billing` | 40 | الفواتير والدفع |
| `user` | 30 | وصول معتاد |
| `viewer` | 10 | قراءة فقط |

الصلاحيات تتبع النمط `module:action` مثل `apps:create` و `domains:delete`.
المصفوفة الكاملة على **/users/roles**.

---

## LeaxPanel Doctor

افتح **http://localhost:3000/doctor** أو شغّل `npm run doctor`.

يشمل الفحص: إصدار Node.js، الاتصال بقاعدة البيانات، الترحيلات، حساب المدير، مجلدات
التخزين، المنافذ، الأسرار الأمنية، الأدوار والصلاحيات، النطاقات و SSL، نظام النسخ
الاحتياطية، ملفات السجلات، ومعالج الإعداد.

زر **Fix everything** يطبّق كل الإصلاحات المتاحة دفعة واحدة.

---

## حل المشكلات

| المشكلة | الحل |
| --- | --- |
| `EADDRINUSE` | عملية أخرى تستعمل المنفذ 3000. غيّر `PORT` في `.env`. |
| `secret option required for sessions` | `.env` ينقصه `SESSION_SECRET`. شغّل `npm run install:setup`. |
| `invalid csrf token` | انتهت الجلسة. أعد تحميل الصفحة وسجّل الدخول من جديد. |
| جداول فارغة | شغّل `npm run migrate && npm run seed`. |
| المنفذ غير متاح | افتح TCP 3000 في الجدار الناري. |
| صفحة 404 | شغّل `npm run crawl` لعرض المسارات الفاشلة. |

---

## الروابط

| المورد | الرابط |
| --- | --- |
| المستودع | https://github.com/netblood/LeaxPanel-OS- |
| المشاكل والأخطاء | https://github.com/netblood/LeaxPanel-OS-/issues |
| الإصدارات | https://github.com/netblood/LeaxPanel-OS-/releases |
| دليل التثبيت | [docs/INSTALL.md](docs/INSTALL.md) |
| البنية التقنية | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| مرجع API | [docs/API.md](docs/API.md) |
| الدليل الإنجليزي | [README.md](README.md) |
| عن المشروع | [AboutPanel.md](AboutPanel.md) |

---

## الترخيص

**رخصة MIT**.

من إنشاء وتنظيم **Bilal Chentouf (NetBlood)** — تطوير بمساعدة الذكاء الاصطناعي.
