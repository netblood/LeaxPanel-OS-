# دليل التثبيت - LeaxPanel(os)

## التثبيت السريع (المستحسن)

أسرع طريقة لتشغيل LeaxPanel هي استخدام المثبِّت بأمر واحد:

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.sh | bash
```

### Windows (PowerShell)

```powershell
iwr -useb https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.bat | iex
```

### Windows (نقرة مزدوجة)

انقر نقراً مزدوجاً على `install.bat` لتثبيت الاعتماديات وإنشاء حساب المسؤول.

---

## التثبيت اليدوي

للإعداد اليدوي، اتبع الخطوات التالية:

### المتطلبات

- **Node.js 22+** و **npm 10+**
- لا يتطلب خادم قاعدة بيانات (SQLite مدمج)
- لا يتطلب Redis أو MinIO

### الخطوات

1. **استنسخ المستودع**

   ```bash
   git clone https://github.com/netblood/LeaxPanel-OS-.git
   cd LeaxPanel-OS-
   ```

2. **ثبت التبعيات**

   ```bash
   npm install
   ```

3. **عدِّل متغيرات البيئة**

   ```bash
   cp .env.example .env
   # عدل .env بإعداداتك (خاصة ADMIN_EMAIL و ADMIN_PASSWORD إن رغبت)
   ```

4. **شغِّل ترحيلات قاعدة البيانات**

   ```bash
   npm run migrate
   ```

5. **زرِّع المسؤول والأدوار**

   ```bash
   npm run seed
   ```

6. **شغِّل اللوحة**

   ```bash
   npm start
   # أو: node server.js
   # الوصول على: http://localhost:3000
   ```

### ما بعد التثبيت

بعد تشغيل اللوحة:

1. افتح [http://localhost:3000](http://localhost:3000/) في متصفحك
2. سجِّل دخول بمصادقة المسؤول (المولَّدة أثناء التثبيت أو محددة عبر `.env`)
3. اختيارياً شغِّل **معالج الإعداد** على http://localhost:3000/setup
4. أضف خدمتك الأولى باستخدام أزرار "إنشاء سريع"

---

## تفاصيل المثبِّت بأمر واحد

المثبِّت يدير **كل شيء تلقائياً**:

| الخطوة | الإجراء |
| --- | --- |
| 1 | التحقق من Node.js 22+ (و npm) |
| 2 | فتح منفذ الجدار الناري `3000` (ufw / firewalld / netsh) |
| 3 | توليد `SESSION_SECRET`، `JWT_SECRET`، `ENCRYPTION_KEY`، كلمة مرور المسؤول |
| 4 | تثبيت تبعيات npm |
| 5 | تطبيق كل ترحيلات قاعدة البيانات |
| 6 | زرع الأدوار، الصلاحيات وحساب المسؤول |
| 7 | تشغيل مجموعة التحقق وطباعة بيانات الاعتماد |

تُكتب بيانات الاعتماد المُولَّدة أيضاً إلى `INSTALL_CREDENTIALS.txt` في جذر المشروع.

### متغيرات بيئة المثبِّت

يمكنك تخصيص التثبيت بتعيين متغيرات البيئة هذه قبل تشغيل المثبِّت:

| المتغير | القيمة الافتراضية | الوصف |
| --- | --- | --- |
| `ADMIN_EMAIL` | `owner@leaxos.local` | بريد المسؤول الإلكتروني |
| `ADMIN_PASSWORD` | مولَّد تلقائياً | كلمة مرور المسؤول |
| `SESSION_SECRET` | مولَّد تلقائياً | سر توقيع الجلسة |
| `PORT` | `3000` | منفذ الخادم |
| `HOST` | `0.0.0.0` | مضيف الربط للخادم |

### المثبِّت لـ Linux / macOS

```bash
# شغل مباشرة من GitHub
curl -fsSL https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.sh | bash

# أو شغل من المستودع المستنسَخ
chmod +x install.sh
./install.sh
```

### المثبِّت لـ Windows

```powershell
# شغل مباشرة من GitHub
iwr -useb https://raw.githubusercontent.com/netblood/LeaxPanel-OS-/main/install.bat | iex

# أو شغل من المستودع المستنسَخ
install.bat
```

---

## إدارة قاعدة البيانات

تستخدم LeaxPanel **SQLite** مع وضع WAL لكل تخزين البيانات. لا يتطلب خادم قاعدة بيانات خارجي.

### موقع ملف SQLite

الافتراضي: `./data/leaxos.db`

### أوامر الترحيل

```bash
# إنشاء المخطط (مكافئ لـ npm run migrate)
node scripts/bootstrap.js --migrate

# زرع المسؤول
node scripts/bootstrap.js --seed

# الترحيل الكامل (ترحيل + زرع)
node scripts/bootstrap.js
```

### النسخ الاحتياطي والاستعادة

```bash
# إنشاء نسخة احتياطية
cp data/leaxos.db data/backups/leaxos-$(date +%Y%m%d).db

# الاستعادة من نسخة احتياطية
cp data/backups/leaxos-20240101.db data/leaxos.db
```

---

## إدارة شهادات SSL

تدعم LeaxPanel شهادات SSL من خلال:

- **Certbot** (شهادات Let’s Encrypt المجانية)
- **Cloudflare** (شهادات أصلية)
- **الشهادات المرفوعة يدوياً**

إدارة SSL من خلال لوحة التحكم في قسم "النطاقات و SSL".

---

## الترقية

راجع [UPGRADE.md](./UPGRADE.md) لدليل الترقية الكامل مع مصفوفة التوافق والأسئلة الشائعة.

---

## استكشاف الأخطاء وإصلاحها

راجع قسم [حل المشكلات](TROUBLESHOOTING.md) في دليل المستخدم أو افتح [لوحة الطبيب](http://localhost:3000/doctor) لفحص اللوحة وإصلاح المشكلات تلقائياً.

---

## التوثيق والروابط

- [README.md](./README.md) - نظرة عامة على المشروع
- [USER_GUIDE.md](./USER_GUIDE.md) - دليل المستخدم الكامل
- [USER_GUIDE_AR.md](./USER_GUIDE_AR.md) - دليل المستخدم بالعربية
- [AI.md](./AI.md) - إعداد وكلاء الذكاء الاصطناعي
- [N8N.md](./N8N.md) - أتمتة سير العمل n8n
- [WHATSAPP.md](./WHATSAPP.md) - تكامل واتساب للأعمال
- [DISCORD.md](./DISCORD.md) - تكامل Discord
- [TELEGRAM.md](./TELEGRAM.md) - تكامل Telegram
- [BACKUP.md](./BACKUP.md) - دليل النسخ الاحتياطي
- [SECURITY.md](./SECURITY.md) - دليل الأمان
- [API.md](./API.md) - توثيق واجهة برمجة التطبيقات

---

## الترخيص

مخصص لأغراض خاصة وتجارية. © 2024-2026 Bilal Chentouf (NetBlood).