// Tiny UI translation layer: English and Arabic (RTL). The language is kept in a "lang" cookie.
// Status values stay English in the database and API; only their labels are translated.
import type { Status } from "./schema";

export const LANGS = ["en", "ar"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_COOKIE = "lang";

export function normalizeLang(value: string | undefined | null): Lang {
  return value === "ar" ? "ar" : "en";
}

export function dirOf(lang: Lang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

const en = {
  appName: "Apply Board",
  tagline: "Track internship applications, deadlines and notes in one place.",
  switchLang: "العربية",
  email: "Email",
  password: "Password (8+ characters)",
  signIn: "Sign in",
  createAccount: "Create account",
  needAccount: "Need an account?",
  haveAccount: "Have an account?",
  tryDemo: "Try the demo",
  wentWrong: "Something went wrong",
  requestFailed: "Request failed",
  demoAccount: "Demo account with fictional data",
  exportIcs: "Export deadlines (.ics)",
  signOut: "Sign out",
  summary: "Summary",
  applications: "applications",
  responseRate: "response rate",
  deadlines14: "deadlines in 14 days",
  interviews: "interviews",
  pasteAd: "Paste a job ad",
  pasteAdHelp: "Company, role, deadline and link are read from the text on the server (no AI key needed). Check them, then add.",
  adText: "Job ad text",
  fillFromAd: "Fill the form from this ad",
  checklistTitle: "Your preparation checklist (saved to notes when you add)",
  addApplication: "Add application",
  company: "Company",
  role: "Role",
  status: "Status",
  deadline: "Deadline",
  link: "Link",
  add: "Add",
  byStatus: "Applications by status",
  days: "days",
  posting: "Posting",
  notes: "Notes",
  delete: "Delete",
  confirmDelete: "Delete this application?",
  skip: "Skip to content",
} as const;

export type Messages = Record<keyof typeof en, string>;

const ar: Messages = {
  appName: "لوحة التقديمات",
  tagline: "تابعي طلبات التدريب والمواعيد النهائية والملاحظات في مكان واحد.",
  switchLang: "English",
  email: "البريد الإلكتروني",
  password: "كلمة المرور (٨ أحرف أو أكثر)",
  signIn: "تسجيل الدخول",
  createAccount: "إنشاء حساب",
  needAccount: "ما عندك حساب؟",
  haveAccount: "عندك حساب؟",
  tryDemo: "جرّب النسخة التجريبية",
  wentWrong: "حدث خطأ ما",
  requestFailed: "فشل الطلب",
  demoAccount: "حساب تجريبي ببيانات وهمية",
  exportIcs: "تصدير المواعيد (.ics)",
  signOut: "تسجيل الخروج",
  summary: "ملخص",
  applications: "تقديم",
  responseRate: "نسبة الرد",
  deadlines14: "مواعيد خلال ١٤ يومًا",
  interviews: "مقابلات",
  pasteAd: "الصقي إعلان الوظيفة",
  pasteAdHelp: "يقرأ الخادم الشركة والوظيفة والموعد والرابط من النص (بدون مفتاح ذكاء اصطناعي). راجعيها ثم أضيفي.",
  adText: "نص الإعلان",
  fillFromAd: "عبّي النموذج من هذا الإعلان",
  checklistTitle: "قائمة التحضير (تُحفظ في الملاحظات عند الإضافة)",
  addApplication: "إضافة تقديم",
  company: "الشركة",
  role: "الوظيفة",
  status: "الحالة",
  deadline: "الموعد النهائي",
  link: "الرابط",
  add: "إضافة",
  byStatus: "التقديمات حسب الحالة",
  days: "أيام",
  posting: "الإعلان",
  notes: "ملاحظات",
  delete: "حذف",
  confirmDelete: "حذف هذا التقديم؟",
  skip: "تخطي إلى المحتوى",
};

const statusAr: Record<Status, string> = {
  wishlist: "قائمة الأمنيات",
  applied: "تم التقديم",
  interview: "مقابلة",
  offer: "عرض",
  rejected: "مرفوض",
};

export const messages: Record<Lang, Messages> = { en, ar };

export function statusLabel(lang: Lang, s: Status): string {
  return lang === "ar" ? statusAr[s] : s;
}
