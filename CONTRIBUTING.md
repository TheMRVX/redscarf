# راهنمای مشارکت و استانداردهای توسعه (Contributing Guidelines)

به پروژه **RedScarf** خوش آمدید. هدف این سند، ایجاد یک استاندارد حرفه‌ای، یکپارچه و تیمی برای توسعه، نسخه‌گذاری (Versioning)، جریان کاری گیت (Git Workflow)، ایزوله‌سازی محیط کار با Worktree و نگارش اصولی تاریخچه پروژه است.

> [!IMPORTANT]
> **قانون طلایی پروژه:** «کامیت باری به هر جهت و بی‌معنی ننویس!»  
> تاریخچه گیت (Git History) سند زنده و تاریخچه مهندسی پروژه است، نه سطل زباله برای ذخیره فایل‌های موقت. هر کامیت باید یک هدف شفاف، اتمیک (Atomic) و معنادار داشته باشد.

---

## ۱. چرخه کاری گیت (Git Workflow & Branching)

ما از مدل **Trunk-Based Development** به عنوان الگوی اصلی استفاده می‌کنیم:
* شاخه `main` همیشه باید پایدار، تست‌شده و قابل استقرار (Deployable) باشد.
* مستقیماً روی `main` پوش نکنید (به جز هات‌فیکس‌های حیاتی یا مستندات با هماهنگی).
* برای هر تسک، یک برنچ کوتاه-عمر (۱ الی ۳ روزه) از `main` ایجاد کنید.

```text
main ──●──────●──────●──────●── (همیشه پایدار و قابل دیپلوی)
        ╲            ╱
         ●──●───────╱   ← feature / fix branches (کوتاه و متمرکز)
```

### نام‌گذاری استاندارد برنچ‌ها:
* `feature/<feature-name>` (مثال: `feature/telegram-payment`)
* `fix/<bug-description>` (مثال: `fix/caddy-ssl-handshake`)
* `refactor/<scope>` (مثال: `refactor/db-connection-pool`)
* `docs/<topic>` (مثال: `docs/deployment-guide`)

---

## ۲. استفاده از Git Worktrees برای ایزوله‌سازی

برای جلوگیری از `git stash`های خطرناک یا جابه‌جایی کثیف بین برنچ‌ها وقتی روی چند تسک کار می‌کنید، از **Git Worktree** استفاده کنید:

```bash
# ایجاد یک شاخه جدید در یک دایرکتوری کاملاً مستقل و تمیز
git worktree add ../redscarf-feature-payment -b feature/payment

# رفتن به پوشه مجزا و کار روی آن
cd ../redscarf-feature-payment

# پس از اتمام کار و ادغام برنچ:
cd ../redscarf
git worktree remove ../redscarf-feature-payment
```

---

## ۳. استاندارد کامیت‌نویسی (Conventional Commits)

تمامی کامیت‌ها **باید** دقیقاً از استاندارد [Conventional Commits](https://www.conventionalcommits.org/) پیروی کنند.

### ساختار پیام کامیت:
```text
<type>(<scope>): <short description>

[optional body: explain WHY, not just WHAT]

[optional footer(s): e.g. BREAKING CHANGE or Closes #123]
```

### انواع مجاز (Commit Types):
| نوع (`type`) | کاربرد | مثال |
| :--- | :--- | :--- |
| **`feat`** | قابلیت یا ویژگی جدید برای کاربر | `feat(bot): add bulk download support` |
| **`fix`** | رفع باگ یا خطای سیستمی | `fix(miniapp): resolve font loading delay` |
| **`refactor`** | تغییر ساختار کد بدون تغییر در رفتار ظاهری | `refactor(api): modularize auth middleware` |
| **`perf`** | بهبود پرفورمنس و سرعت اجرا | `perf(db): add index to posts query` |
| **`docs`** | تغییر یا اضافه کردن مستندات | `docs(readme): update deployment prerequisites` |
| **`style`** | تغییرات ظاهری کد (فاصله‌گذاری، فرمت، بدون تغییر منطق) | `style(admin): fix lint indentation` |
| **`test`** | افزودن یا اصلاح تست‌ها | `test(api): add tests for token verification` |
| **`chore`** | تغییر بیلد، پیکربندی، داکر یا وابستگی‌ها | `chore(deps): bump aiogram to 3.14.0` |
| **`ci`** | تغییر در پایپ‌لاین‌های CI/CD | `ci(actions): add docker build workflow` |

### آنتی‌پترن‌ها و خط قرمزها ⛔
* ❌ `git commit -m "fix"` یا `git commit -m "update"` یا `git commit -m "wip"`
* ❌ `git commit -m "changes"` یا `git commit -m "some fixes"`
* ❌ کامیت‌های فله‌ای که در آن هم فیچر اضافه شده، هم ریفکتور انجام شده و هم فایل داکر تغییر کرده است.

### نمونه‌های درست و استاندارد:
```text
feat(miniapp): implement copy-to-clipboard for share links

Users previously had to manually select the link text, which was
difficult on mobile touchscreens. This adds an instant copy button
with visual feedback.
```

---

## ۴. نسخه‌گذاری معنایی (Semantic Versioning - SemVer)

پروژه از سیستم استاندارد `MAJOR.MINOR.PATCH` پیروی می‌کند:

```text
v 1 . 4 . 2
  │   │   └── PATCH: رفع باگ بدون تغییر در اینترفیس‌ها (تغییرات نوع fix, perf)
  │   └────── MINOR: افزودن فیچرهای سازگار با گذشته (تغییرات نوع feat)
  └────────── MAJOR: تغییرات ساختاری و ناسازگار (Breaking Changes)
```

* **Breaking Changes:** اگر تغییری باعث ناسازگاری در دیتابیس، API یا پیکربندی قبلی شود، نوع کامیت به صورت `feat!:` یا با فوتر `BREAKING CHANGE:` ثبت شده و شماره `MAJOR` افزایش می‌یابد.

---

## ۵. نگهداری گزارش تغییرات (CHANGELOG.md)

تمامی انتشارهای پروژه در فایل `CHANGELOG.md` بر اساس استاندارد [Keep a Changelog](https://keepachangelog.com/) ثبت می‌شوند.

دسته‌بندی‌های رسمی در هر نسخه:
* **`Added`** برای قابلیت‌های جدید.
* **`Changed`** برای تغییر در عملکردهای موجود.
* **`Deprecated`** برای قابلیت‌هایی که به زودی حذف می‌شوند.
* **`Removed`** برای قابلیت‌های حذف‌شده.
* **`Fixed`** برای رفع باگ‌ها.
* **`Security`** برای موارد امنیتی و پچ‌های آسیب‌پذیری.
* **`Performance`** برای بهبودهای کارایی و پرفورمنس.

---

## ۶. فرآیند Pull Request و بازبینی کد (Code Review)

قبل از ثبت درخواست ادغام (PR)، این موارد را بررسی کنید:
1. **بررسی شخصی (Self-review):** دیف کد خود را با `git diff` یک بار خط به خط بخوانید. هیچ فایل باینری اضافه، پرینت‌های دیباگ (`console.log`, `print`) یا لاگ‌های شخصی نباید بماند.
2. **سایز متناسب PR:** حجم تغییرات هر PR ترجیحاً نباید از ۳۰۰ تا ۴۰۰ خط فراتر برود تا بازبینی آن دقیق باشد.
3. **ری‌بیس روی شاخه اصلی:** قبل از ادغام، برنچ خود را روی آخرین `main` ری‌بیس کنید تا تاریخچه خطی بماند:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
4. **تکمیل تمپلیت PR:** توضیحات واضح درباره چرایی تغییرات، نحوه تست و تأثیر آن بر سایر بخش‌ها بنویسید.
