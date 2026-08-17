# 🚀 MixChat — Full-Stack Production Architecture, Execution Phases & Master Blueprint

> **مستند المعمارية وخطة التنفيذ المرجعية الشاملة (Master Roadmap)**
> يوثق هذا الملف كافة ميزات الفرونت اند الحالية المكتملة، وخطة بناء وربط الباك اند (NestJS 11 + Prisma + PostgreSQL + Redis) من المرحلة 0 وحتى المرحلة 17 بدقة إنتاجية كاملة.

---

## 📑 فهرس المراحل التنفيذية (Phases Overview)

- [Phase 0 — Foundation, Modernization & Full-Stack Contracts](#phase-0--foundation-modernization--full-stack-contracts)
- [Phase 1 — Authentication, Sessions & Account Security](#phase-1--authentication-sessions--account-security)
- [Phase 2 — Users, Profiles, Social Graph & Privacy](#phase-2--users-profiles-social-graph--privacy)
- [Phase 3 — Media Platform](#phase-3--media-platform)
- [Phase 4 — Posts, Feed & Core Interactions](#phase-4--posts-feed--core-interactions)
- [Phase 5 — Comments, Replies & Post Social Depth](#phase-5--comments-replies--post-social-depth)
- [Phase 6 — Stories & Story Archive](#phase-6--stories--story-archive)
- [Phase 7 — Reels & Vertical Video Feed](#phase-7--reels--vertical-video-feed)
- [Phase 8 — Messaging Persistence & Conversations](#phase-8--messaging-persistence--conversations)
- [Phase 9 — Realtime Messaging, Presence & Typing](#phase-9--realtime-messaging-presence--typing)
- [Phase 10 — Notifications Engine & Live Notification Center](#phase-10--notifications-engine--live-notification-center)
- [Phase 11 — Search, Discovery & Recommendations](#phase-11--search-discovery--recommendations)
- [Phase 12 — Snap Map & Location Privacy](#phase-12--snap-map--location-privacy)
- [Phase 13 — Anonymous Matching & Anonymous Chat](#phase-13--anonymous-matching--anonymous-chat)
- [Phase 14 — Moderation, Safety & User Controls](#phase-14--moderation-safety--user-controls)
- [Phase 15 — PWA, Push, Offline Resilience & UX Hardening](#phase-15--pwa-push-offline-resilience--ux-hardening)
- [Phase 16 — Performance, Security & Production Hardening](#phase-16--performance-security--production-hardening)
- [Phase 17 — Full E2E, Deployment & Release](#phase-17--full-e2e-deployment--release)

---

## 🎯 تفاصيل المراحل التنفيذية (Detailed Execution Blueprint)

---

### Phase 0 — Foundation, Modernization & Full-Stack Contracts `[✅ COMPLETED]`
> **الهدف**: تحديث الـ Next.js الحالي بدون تكسير التصميم، وإنشاء NestJS production foundation جاهز للإنتاج.

* **الـ Backend (NestJS)**:
  - NestJS 11 مع Express Adapter و TypeScript Strict Mode.
  - إعداد Prisma 7 مع PostgreSQL.
  - إعداد Redis للـ Caching والـ Message Broker.
  - Config validation موثوق عبر `@nestjs/config` و `joi` / `zod`.
  - Global validation pipe مع `class-validator` و `class-transformer`.
  - Error envelope موحد للاستجابات والأخطاء (`{ success, data, message, statusCode, errors }`).
  - توثيق كامل عبر Swagger / OpenAPI (`@nestjs/swagger`).
  - تتبع الطلبات عبر Request IDs (`x-request-id`).
  - Structured Logging موحد عبر `Pino` أو `Winston`.
  - Health & Readiness endpoints (`/api/health`, `/api/ready`) عبر `@nestjs/terminus`.
  - بيئة تشغيل محلية جاهزة عبر Docker Compose (PostgreSQL + Redis + MinIO).
  - إعداد نظام الـ Migrations و Seeds الأولية.
  - إعدادات الأمان الأساسية: CORS، Cookie Parser، Helmet security headers، و Rate Limiting foundation (`@nestjs/throttler`).

* **الـ Frontend (Next.js)**:
  - ترقية حزم Next.js / React / Tailwind CSS / Framer Motion لأحدث النسخ المستقرة بدون المساس بالـ UI.
  - تطوير `apiClient.ts` وإلغاء الاعتماد الأمني على `localStorage` للتوكنات الحساسة والانتقال لـ HttpOnly Cookies.
  - إنشاء عقود برمجية مكتوبة بالكامل (Typed API Contracts) مستخرجة من OpenAPI.
  - معالجة أخطاء موحدة مع Error Boundaries و Loading / Error Primitives.

* **معيار الاكتمال (Completion Criteria)**:
  - المشروعان (Frontend + Backend) يعملان ويبنيان بنجاح (`build` & `test`) دون أي أخطاء وواجهة Next الحالية سليمة 100%.

---

### Phase 1 — Authentication, Sessions & Account Security `[✅ COMPLETED]`
> **الهدف**: نظام مصادقة وإنشاء جلسات حقيقي ومؤمّن بالكامل (Full-Stack Auth) يربط الـ Front بالـ Back وليس مجرد واجهة تسجيل.

* **الـ Backend**:
  - عمليات: `register` / `login` / `logout` / `logout-all`.
  - إصدار Access Token (JWT قصير العمر 15 دقيقة).
  - جلسات Rotating Refresh Tokens مخزنة في قاعدة البيانات / Redis.
  - إرسال الـ Refresh Token عبر `HttpOnly Secure SameSite=Lax` Cookie.
  - تشفير كلمات المرور باستخدام **Argon2id**.
  - تتبع سجلات الجلسات والأجهزة (Session & Device records: IP, User-Agent, Last Active).
  - نقطة التحقق من الهوية `GET /api/auth/me`.
  - كشف إعادة استخدام التوكن المسروق (Refresh-token reuse detection) وإبطال كافة جلسات المستخدم تلقائياً.
  - حماية مسارات الـ Auth عبر Rate Limiting صارم لمنع Brute-Force.
  - تسجيل أحداث الأمان (Security & Auth Events).
  - مسارات استعادة كلمة المرور (Forgot / Reset password)، ودعم OTP فقط عند الحاجة الحقيقية.

* **الـ Frontend**:
  - شاشات Sign Up و Login الحقيقية.
  - استعادة الجلسة التلقائية (Session Restoration) عند فتح التطبيق.
  - حماية المسارات (Protected Routes & Auth Guards).
  - تجديد تلقائي أحادي للتوكن (Auto Refresh Single-Flight) لمنع تضارب الطلبات المتزامنة.
  - معالجة انتهاء الجلسة (Expired Session Handling) وإعادة التوجيه السلس.
  - حالات التحميل والتأكيد (Auth Loading States) مع إظهار أخطاء الـ Backend بدقة.

* **معيار الاكتمال (Completion Criteria)**:
  - مستخدم حقيقي يسجل حساباً، ويسجل دخوله، ويغلق المتصفح ويعيد فتحه فتظل الجلسة نشطة ومؤمنة بدون أي Fake Data.

---

### Phase 2 — Users, Profiles, Social Graph & Privacy `[✅ COMPLETED]`
> **الهدف**: بناء الأساس الاجتماعي والعلاقات والخصوصية قبل البدء في الـ Feed.

* **الـ Backend**:
  - نماذج `User` و `Profile` و `UserPrivacySettings`.
  - البحث بالاسم واليوزرنيم (`username` / search).
  - إدارة بيانات البروفايل (Avatar, Banner, Bio, Social Links).
  - نموذج علاقات واضح (Followers / Following أو Friends حسب المعتمد).
  - إدارة طلبات الصداقة/المتابعة في الحسابات الخاصة (Requests).
  - قائمة الأصدقاء المقربين (Close Friends List).
  - الحظر وإلغاء الحظر (Block / Unblock).
  - خصوصية الحساب (Public vs Private Account).
  - خدمة سياسة العلاقات الموحدة (Relationship Policy Service) للتحقق من صلاحية الوصول ورؤية المحتوى.

* **الـ Frontend**:
  - صفحة البروفايل الكاملة لصاحب الحساب وللزائر (`/profile/[username]`).
  - شاشة تعديل البروفايل (Edit Profile).
  - قوائم المتابعين والمتابَعين (Followers / Following).
  - أزرار التفاعل الاجتماعي (Follow/Unfollow أو Add Friend/Accept/Reject).
  - حالات البروفايل الخاص والبروفايل المحظور.
  - ربط كافة صور وأسماء المستخدمين في التطبيق بصفحة البروفايل الخاصة بهم.

* **معيار الاكتمال (Completion Criteria)**:
  - كافة حالات العلاقات والخصوصية حقيقية ومختبرة وتنعكس فوراً بين أي حسابين.

---

### Phase 3 — Media Platform `[✅ COMPLETED]`
> **الهدف**: بناء بنية تحتية مركزية للميديا قبل البدء في الـ Posts والـ Stories والـ Reels لتفادي تكرار الأكواد.

* **الـ Backend**:
  - نموذج `MediaObject` لتتبع كافة الوسائط وحالات معالجتها.
  - توليد روابط رفع مؤقتة وموقعة (Presigned Upload Intents) للرفع المباشر إلى التخزين المتوافق مع S3 (S3 / R2 / Cloudinary).
  - نقطة اكتمال الرفع والتحقق (`POST /api/media/complete`).
  - التحقق الصارم من الـ MIME Type وحجم الملف والأبعاد.
  - استخراج الـ Metadata (العرض، الارتفاع، مدة الفيديو، التنسيق).
  - دعم الروابط الموقعة للوسائط الخاصة (Signed / Private Access).
  - نظام تنظيف الوسائط المعلقة وغير المستخدمة (Cleanup / Orphan Handling Cron).
  - بيئة تطوير محلية عبر **MinIO** وبيئة إنتاج عبر S3 أو Cloudflare R2.

* **الـ Frontend**:
  - مكونات اختيار ورفع الوسائط (Picker & Uploader).
  - مؤشرات التقدم للرفع (Upload Progress Bar).
  - إمكانية الإلغاء وإعادة المحاولة (Retry / Cancel).
  - معاينة فورية قبل الرفع (Instant Previews).
  - مكونات عرض الصور والفيديوهات المحسنة (Progressive Loading & Error Fallbacks).

* **معيار الاكتمال (Completion Criteria)**:
  - أي ميزة تالية في التطبيق تستخدم فقط `Media IDs` المركزية دون إعادة كتابة كود الرفع.

---

### Phase 4 — Posts, Feed & Core Interactions ✅ (COMPLETED)
> **الهدف**: إطلاق أول حلقة تفاعل اجتماعي حقيقية (Social Loop).

* **الـ Backend**:
  - عمليات: `create` / `edit` / `delete` / `get` post.
  - دعم أنواع المحتوى: نص، صور، فيديو، ألبوم متعدد (Carousel).
  - تحديد جمهور المنشور: عام (Public)، متابعين (Followers)، أصدقاء مقربون (Close Friends).
  - استخراج الهاشتاغات والمنشن تلقائياً (`#hashtag`, `@username`).
  - تقسيم صفحات الخلاصة (Cursor-based Pagination).
  - خلاصات متعددة: For You / Following / Trending.
  - الإعجابات (Likes)، الحفظ في المفضلة (Bookmarks)، وإعادة النشر / الاقتباس (Reposts / Quotes).
  - البنية الأساسية لتتبع مرات الظهور (Impression Tracking).
  - إنشاء فهارس قاعدة البيانات (Database Indexes) للاستعلامات السريعة.

* **الـ Frontend**:
  - تحويل شاشة الفيد الرئيسية من الـ Mock Data إلى البيانات الحقيقية.
  - ملحن المنشورات المتطور (Media Composer).
  - تعديل وحذف المنشورات للمالك.
  - تفاعل تفاؤلي سريع (Optimistic Likes & Saves).
  - سحب لتحديث الصفحة (Pull-to-Refresh) وتحميل لا نهائي (Infinite Scroll).
  - هياكل التحميل الضبابية (Loading Skeletons).
  - صفحة المنشور المفرد (`/feed/[id]`) مع عدادات حقيقية.

* **معيار الاكتمال (Completion Criteria)**:
  - المستخدم (A) ينشر بوست، ويظهر فوراً في خلاصة المستخدم (B) مع إمكانية التفاعل معه والتعليق عليه من الواجهة.

---

### Phase 5 — Comments, Replies & Post Social Depth
> **الهدف**: تعميق التفاعل الاجتماعي وفصل التعليقات والردود لضمان كفاءة الأداء.

* **الـ Backend**:
  - إضافة وتعديل وحذف التعليقات والردود المتداخلة (Comments & Threaded Replies).
  - الإعجاب بالتعليقات.
  - صفحات التعليقات عبر Cursor Pagination.
  - عدادات تعليقات دقيقة وتلقائية التحديث.
  - التحقق من صلاحيات التعديل والحذف (Authorization Guards).
  - استخراج المنشن وإرسال إشعارات لأصحاب التعليقات.
  - معالجة التعليقات المحذوفة ذات الردود (Deleted-comment semantics: "This comment was deleted").

* **الـ Frontend**:
  - نافذة التعليقات السفلية السريعة (Comments Sheet) وصفحة البوست الكاملة.
  - ملحن كتابة التعليق مع دعم الإيموجي والمنشن.
  - نظام الردود على تعليق محدد (Reply to thread).
  - تفاعلات إعجاب تفاؤلية سريعة على التعليقات.
  - تجربة كيبورد سلسة على الموبايل و Deep Linking للتعليق المستهدف.

* **معيار الاكتمال (Completion Criteria)**:
  - دورة حياة التعليق والرد بالكامل متصلة من الـ UI إلى قاعدة البيانات.

---

### Phase 6 — Stories & Story Archive
> **الهدف**: نظام استوريات حقيقي ومكتمل مثل إنستغرام مع انتهاء الصلاحية بعد 24 ساعة.

* **الـ Backend**:
  - إنشاء استوري جديد باستخدام `Media IDs`.
  - تحديد جمهور الاستوري (`PUBLIC`, `FOLLOWERS`, `CLOSE_FRIENDS`).
  - انتهاء الصلاحية التلقائي بعد 24 ساعة (24h Expiration Query & Cron).
  - تجميع الاستوريات النشطة حسب المستخدم (Active Story Groups).
  - تسجيل المشاهدات وقائمة المشاهدين (Viewers List).
  - التفاعلات السريعة والردود في الخاص (Story Reactions & DM Replies).
  - أرشفة الاستوريات المنتهية في حساب المالك فقط (Stories Archive).
  - فرض قيود الحظر والخصوصية.

* **الـ Frontend**:
  - شريط استوريات حقيقي في أعلى الفيد (Story Tray).
  - شاشة إنشاء استوري مع اختيار الوسائط والنصوص.
  - عارض استوري بملء الشاشة بجودة إنستغرام (Segmented Progress Bars, Tap to navigate, Hold to pause, Double-tap heart).
  - قائمة مشاهدي الاستوري للمالك.
  - صفحة أرشيف الاستوريات السابقة (`/stories/archive`).

* **معيار الاكتمال (Completion Criteria)**:
  - استوري يعمل بالكامل End-to-End مع مؤقت زمني حقيقي ينتهي بعد 24 ساعة وينتقل للأرشيف.

---

### Phase 7 — Reels & Vertical Video Feed
> **الهدف**: خلاصة مقاطع فيديو عمودية حقيقية وعالية الأداء (Performant Video Feed).

* **الـ Backend**:
  - نموذج `Reel` وربطه بـ Media IDs للفيديو والبوستر.
  - العناوين، الهاشتاغات، ومسار الصوت (Audio Track / Soundtrack).
  - الإعجابات، الحفظ، المشاركة، وعدادات المشاهدة.
  - خلاصة For You وخلاصة Following عبر Cursor Feed.
  - الأساس البرمجي لاحتساب مقاييس المشاهدة والإكمال (Watch Time Metrics).

* **الـ Frontend**:
  - ربط شاشة الـ Reels الحالية بـ APIs الباك اند الحقيقية.
  - تحميل مسبق محدود وذكي للفيديوهات التالية (Controlled Preloading).
  - إدارة دورة حياة الفيديو (Auto play/pause عند السكرول).
  - حفظ حالة كتم الصوت عبر الجلسة.
  - شريط التقديم والتأخير التفاعلي مع دعم السحب.
  - تفاعلات تفاؤلية سريعة وشيت التعليقات.
  - شاشة نشر ريل جديد (Create Reel Modal).

* **معيار الاكتمال (Completion Criteria)**:
  - خلاصة ريلز سريعة وعالية الأداء متصلة بالسيرفر وليست مجرد Mock Demo.

---

### ✅ Phase 8 — Messaging Persistence & Conversations — COMPLETED
> **الهدف**: بناء وتخزين المحادثات والرسائل بمتانة (Durable REST Layer) قبل طبقة الـ WebSockets.

* **الـ Backend**:
  - المحادثات الفردية والجماعية (Private & Group Conversations).
  - إدارة المشاركين والصلاحيات (Admin, Members).
  - تخزين الرسائل: نص، صور، فيديو، تسجيل صوتي، ملفات.
  - سياسات تعديل وحذف الرسائل.
  - حالة القراءة وتتبع الرسائل غير المقروءة (Unread counts).
  - تقسيم صفحات المحادثة القديمة عبر Cursor Pagination.
  - منع تكرار إرسال الرسالة (Message Idempotency via Client Msg ID).
  - كتم وأرشفة وتثبيت المحادثات (Mute / Archive / Pin).

* **الـ Frontend**:
  - قائمة المحادثات الحقيقية مع آخر رسالة والتوقيت وعدد غير المقروء.
  - شاشة المحادثة المفتوحة مع تحميل الرسائل السابقة بالسكرول لأعلى.
  - ملحن الرسائل المتقدم مع دعم إرسال المرفقات والتسجيلات الصوتية.
  - مؤشرات قراءة وتسليم الرسائل.
  - إرسال تفاؤلي فوري مع مؤشر "جاري الإرسال" (Pending state).

* **معيار الاكتمال (Completion Criteria)**:
  - المحادثات والرسائل تعمل بالكامل وتخزن وتسترجع عبر REST API حتى وإن كان الـ WebSocket مغلقاً.

---

### Phase 9 — Realtime Messaging, Presence & Typing
> **الهدف**: إضافة الـ Realtime فوق طبقة الـ Persistence السابقة لتمكين الشات اللحظي.

* **الـ Backend**:
  - بوابة NestJS WebSocket / Socket.IO Gateway.
  - مصادقة اتصالات الـ Socket عبر JWT Tokens.
  - استخدام **Redis Adapter** لدعم تشغيل سيرفرات متعددة (Multi-instance Scaling).
  - غرف المحادثات اللحظية (Rooms & Channels).
  - أحداث لحظية: إرسال واستقبال الرسائل، مؤشرات الكتابة (Typing start/stop)، حالة الاتصال (Online/Offline Presence)، وإيصالات القراءة والتسليم (Read receipts).
  - إدارة إعادة الاتصال واستئناف الجلسات (Reconnect & Resume).
  - التحكم في معدل إرسال الأحداث (Rate Limiting & Backpressure).

* **الـ Frontend**:
  - عميل `socketClient.ts` الحقيقي مع إدارة الاتصال التلقائي.
  - مزامنة الرسائل اللحظية مع كاش الـ REST.
  - مؤشرات كتابة متحركة (Typing bubbles).
  - مؤشرات ظهور خضراء للأصدقاء المتواجدين الآن.
  - تحديث إيصالات القراءة فوراً في شاشة الطرف الآخر.

* **معيار الاكتمال (Completion Criteria)**:
  - فتح حسابين في متصفحين مختلفين وتجربة الشات والكتابة والظهور لحظياً بدون أي عمل Refresh.

---

### Phase 10 — Notifications Engine & Live Notification Center
> **الهدف**: محرك إشعارات ذكي ومبني على أحداث النطاق (Domain-Event Driven).

* **الـ Backend**:
  - نموذج `Notification`.
  - توليد الإشعارات تلقائياً عبر Domain Events من (Follow, Like, Comment, Story View, Mention, Chat).
  - تصنيف الإشعارات (Likes, Mentions, Social, System).
  - حساب عدد غير المقروء وتعليم الكل كمقروء وحذف الإشعار.
  - إرسال الإشعار لحظياً عبر الـ WebSockets Gateway للعميل النشط.
  - البنية الأساسية لخدمة الـ Web Push Notifications للموبايل والـ PWA.

* **الـ Frontend**:
  - ربط شاشة الإشعارات الحالية (`/notifications`) بالبيانات الحقيقية.
  - عداد إشعارات حي في الهيدر والـ Sidebar.
  - فلاتر التبويب السريعة.
  - أزرار قبول ورفض طلبات الصداقة والمتابعة من داخل كارد الإشعار مباشرة.
  - النقر على الإشعار يوجه مباشرة إلى المنشور أو البروفايل أو المحادثة المستهدفة.

* **معيار الاكتمال (Completion Criteria)**:
  - كل تفاعل مهم في النظام يولد إشعاراً حقيقياً لمرة واحدة فقط ويصل للطرف الآخر لحظياً.

---

### Phase 11 — Search, Discovery & Recommendations
> **الهدف**: محرك بحث واكتشاف ديناميكي وذكي يلغي أي بيانات ثابتة.

* **الـ Backend**:
  - البحث عن المستخدمين والمنشورات والهاشتاغات ومقاطع الريلز.
  - فهارس البحث النصي الكامل في بوستجريس (PostgreSQL FTS & Trigram Indexes `pg_trgm`).
  - خوارزمية احتساب المواضيع الرائجة (Trending Scoring Algorithm).
  - استعلامات الاكتشاف المخصصة للمستخدم مع مراعاة الخصوصية والحظر.
  - تقسيم صفحات نتائج البحث (Cursor Pagination).

* **الـ Frontend**:
  - شاشة الاستكشاف والبحث العالمية (`/search` أو `/explore`).
  - سجل عمليات البحث الأخيرة (Recent Searches) مع إمكانية الحذف.
  - نتائج مبوبة: حسابات، بوستات، هاشتاغات، فيديوهات.
  - تأخير ذكي للطلبات أثناء الكتابة (Debounce 300ms) مع مؤشرات تحميل سريعة.

* **معيار الاكتمال (Completion Criteria)**:
  - لا توجد أي بيانات بحث أو تريند ثابتة في التطبيق.

---

### Phase 12 — Snap Map & Location Privacy — ✅ **COMPLETED**
> **الهدف**: خريطة حية تفاعلية مع حماية قصوى لخصوصية الموقع الجغرافي (MapLibre GL JS + OpenFreeMap + Ephemeral Redis TTL + Ghost Mode).

* **الـ Backend**:
  - فصل بيانات الموقع الجغرافي وحالته: جدول `UserLocationSettings` مع تعداد `LocationVisibility`.
  - صلاحية مؤقتة للموقع: إحداثيات مؤقتة في Redis فقط بمهلة انتهاء `600s TTL`، مع الحذف الفوري عند تفعيل وضع الشبح.
  - قواعد خصوصية صارمة: `LocationVisibilityPolicy` تطبق قواعد الحظر الثنائي، والأصدقاء المقربون، والأصدقاء المتابعون.
  - استخدام Redis لتحديثات المواقع السريعة، وأحداث Socket.IO على نطاق الغرف المصرح لها فقط.
  - واجهات برمجة تطبيقات REST تحت `/api/v1/map` بدون تخزين أي تاريخ مسارات في PostgreSQL.

* **الـ Frontend**:
  - خريطة تفاعلية مدعومة بـ MapLibre GL JS مع نمط MixChat الداكن المخصص بدون أي اعتماد على واجهات خارجية مدفوعة.
  - علامات مخصصة برؤوس الأصدقاء الدائرية (DOM Avatar Markers) مع حلقات الستوري النشطة ونقاط الاتصال بالإنترنت.
  - بطاقة أصدقاء سفلية بنمط سناب شات مع زر مشاهدة الستوري وبدء المحادثة وتقدير المسافة.
  - زر التبديل السريع لوضع التخفي (Ghost Mode) مع نافذة منبثقة تفاعلية للتحكم في الخصوصية.
  - خطاف `useGeolocationSharing` مع قياس البطارية والتوقف التلقائي عند مغادرة الصفحة.

* **معيار الاكتمال (Completion Criteria)**:
  - تم اجتياز جميع اختبارات الوحدة (123/123) واختبارات E2E (117/117) وبناء الواجهة بدون أي أخطاء (38/38 مسار).

---

### ✅ Phase 13 — Anonymous Matching & Anonymous Chat (مكتمل)
> **الهدف**: طابور مطابقة سريع للمحادثات المجهولة مع حماية الخصوصية وميزة كشف الهوية المشترك.

* **الـ Backend**:
  - طابور مطابقة فوري عبر **Redis FIFO Queue** مصنف حسب الاهتمامات والمواضيع مع progressive wait-time relaxation.
  - عمليات مطابقة ذرية (Atomic Matching) لمنع تضارب الاتصالات المتزامنة وحظر المطابقة الذاتية ومطابقة المستخدمين المحظورين.
  - هوية مشفرة ومؤقتة لكل طرف أثناء الجلسة المجهولة (`Anonymous Persona Generator`).
  - بروتوكول طلب كشف الهوية المشترك (Mutual Reveal-Identity Handshake): لا يتم كشف الحساب إلا بموافقة الطرفين معاً.
  - نظام حظر وإبلاغ فوري في الشات المجهول مع جدول `AnonymousReport` في قاعدة البيانات.

* **الـ Frontend**:
  - شاشة انتظار المطابقة والبحث عن شريك محادثة مع رادار نبضي وزر إلغاء ومؤقت.
  - شاشة الشات المجهول مع هوية مموهة وتسجيل رسائل صوتية وفقاعات الدردشة.
  - نافذة طلب وموافقة كشف الهوية المتبادل مع بطاقة الملف الشخصي الأصلية.
  - معالجة انقطاع الطرف الآخر أو مغادرته وخيارات الأمان.

* **معيار الاكتمال (Completion Criteria)**:
  - تم اجتياز جميع اختبارات الوحدة (135/135) واختبارات E2E (127/127) وبناء الواجهة بدون أي أخطاء (38/38 مسار).

---

### Phase 14 — Moderation, Safety & User Controls ✅ **COMPLETED**
> **الهدف**: نظام أمان وبلاغات وحماية متكامل لضمان بيئة تواصل آمنة.

* **الـ Backend**:
  - نظام الإبلاغ عن المستخدمين، البوستات، التعليقات، الاستوريات، الريلز، والرسائل (`Reports Module`).
  - معالجة الحظر المتبادل التلقائي على كافة نقاط النظام.
  - حالات المحتوى المحذوف والمخفي بسبب مخالفة القواعد.
  - أدوات تحكم في الحساب وتحديد من يمكنه مراسلتي أو التعليق عندي.
  - حدود حماية لمنع السلوكيات المزعجة والإغراق (Abuse Rate Limiting).

* **الـ Frontend**:
  - شيت تقديم البلاغ مع خيارات سبب البلاغ.
  - إخفاء محتوى المستخدم المحظور وتحديث الواجهة فورياً.
  - شاشات إعدادات الأمان والخصوصية للمستخدم.

* **معيار الاكتمال (Completion Criteria)**:
  - كافة عناصر الأمان والحظر والإبلاغ تعمل وتنعكس فوراً على مستوى النظام.

---

### Phase 15 — PWA, Push, Offline Resilience & UX Hardening ✅ **COMPLETED**
> **الهدف**: تجربة تطبيق هاتف متكامل مع دعم التثبيت، الإشعارات، والعمل دون اتصال.

* **الـ Frontend**:
  - تطبيق ويب تقدمي قابل للتثبيت بالكامل (Installable PWA مع Manifest و Icons).
  - استراتيجية تخزين مؤقت مدروسة عبر Service Worker للـ App Shell والميديا.
  - شاشات ومؤشرات العمل دون اتصال (Offline States & Reconnect UX).
  - مزامنة البيانات التفاؤلية مع السيرفر فور عودة الاتصال.
  - تجربة كيبورد وانتقالات مسارات سلسة تناسب شاشات الهواتف.

* **الـ Backend**:
  - إدارة اشتراكات الإشعارات للأجهزة (Push Subscriptions Management).
  - معالجة إرسال إشعارات Web Push مع خيارات إعادة المحاولة وإدارة الاشتراكات الميتة.

* **معيار الاكتمال (Completion Criteria)**:
  - التطبيق يثبت على الهاتف كـ PWA ويعمل بسلاسة حتى في ظروف الشبكة الضعيفة.

---

### Phase 16 — Performance, Security & Production Hardening
> **الهدف**: مراجعة شاملة وتحسين الأداء والأمان قبل الإطلاق النهائي.

> **الحالة**: ⚠️ **تم التنفيذ؛ فحوصات بيئة الإصدار معلّقة (Implemented; Release Verification Pending)**
>
> **حالة التنفيذ (2026-08-16)**: تم تنفيذ تحسينات الكود وقاعدة البيانات والأمان، واجتازت جميع بوابات البناء والاختبارات والتدقيق. القياسات الفعلية والتفاصيل موجودة في `PHASE_16_PERFORMANCE_SECURITY_REPORT.md`. لا تزال هناك فحوصات مرتبطة ببيئة الإصدار قبل اعتبار المرحلة مكتملة بالكامل: تدوير أسرار R2/VAPID المحلية، فحص CSP تفاعلي لمسارات مستخدم مسجّل، اختبار WebSocket موزّع، تجربة استعادة PostgreSQL، وربط المراقبة الإنتاجية وحسم تشغيل مهام cron على قائد واحد/قفل موزّع.

* **الـ Backend**:
  - مراجعة وفحص فهارس بوستجريس عبر `EXPLAIN ANALYZE`.
  - تدقيق استعلامات Prisma لمنع مشاكل N+1 Query.
  - تحسين استخدام Redis ومراقبة استهلاك الذاكرة.
  - اختبار أحمال الـ Socket.IO والـ WebSockets.
  - تطبيق حماية CSRF، تشفير الكوكيز، وضبط CSP و Security Headers.
  - إدارة المفاتيح السرية (Secret Management).
  - إعداد المراقبة وتتبع الأخطاء (Sentry / OpenTelemetry / Prometheus).
  - اختبارات النسخ الاحتياطي والاستعادة (Backup & Restore Validation).

* **الـ Frontend**:
  - فحص أداء Google Lighthouse وتحسين Core Web Vitals (LCP, INP, CLS).
  - تحليل حزم الجافاسكريبت وتقليل حجم الـ Bundle.
  - تحسين تحميل الصور والفيديوهات عبر الصيغ الحديثة (WebP, AVIF).
  - فحص تسريبات الذاكرة (Memory Leaks Audit).

* **معيار الاكتمال (Completion Criteria)**:
  - النظام يتحمل آلاف الطلبات المتزامنة ويحقق درجات 90+ في فحوصات الأداء والأمان.
  - **القياس الحالي**: Splash حقق 92 للأداء؛ Login/Register حققا 89/89 مع 100 للوصول، واختبارات API المحلية بلا أخطاء موثقة كخط أساس وليست ادعاء سعة إنتاجية. معيار السعة الموزعة النهائي مؤجل عمداً إلى بيئة Staging في Phase 17.

---

### Phase 17 — Full E2E, Deployment & Release
> **الهدف**: اختبارات شاملة من البداية للنهاية وإطلاق المشروع للإنتاج.

* **الاختبارات الشاملة (E2E Testing via Playwright)**:
  - تغطية السيناريوهات الحيوية: `Signup → Edit Profile → Follow Friend → Create Post → Comment → Share Story → Watch Reel → Send Realtime Message → Receive Notification → Snap Map`.
  - اختبارات التكامل للباك اند (Integration Tests) على قواعد بيانات واختبارات معزولة.

* **النشر والتشغيل (DevOps & Release)**:
  - إعداد بيئة الـ Staging والـ Production.
  - خطوط الإنتاج والدمج المستمر (CI/CD Pipelines عبر GitHub Actions).
  - استراتيجية التراجع التلقائي عند الأخطاء (Rollback Strategy).
  - بذور بيانات أولية تجريبية للبيئة (Production-ready Seeds).
  - إصدار وثائق المعمارية والـ API Docs النهائية.

* **معيار الاكتمال (Completion Criteria)**:
  - إطلاق منصة MixChat بنجاح للجمهور وجاهزيتها للعمل المباشر بدون أي أعطال.
