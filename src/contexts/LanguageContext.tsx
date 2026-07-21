import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Lang = 'ar' | 'en';

const translations = {
  ar: {
    siteName: 'الجسد الواحد',
    home: 'الرئيسية',
    projects: 'المشاريع',
    about: 'عن المنصة',
    login: 'دخول',
    logout: 'تسجيل الخروج',
    startProject: 'ابدأ مشروعك',
    dashboard: 'لوحة التحكم',
    adminPanel: 'لوحة الإدارة',
    donateNow: 'تبرع الآن',
    donateToProject: 'تبرع للمشروع',
    chooseAmount: 'اختر مبلغ التبرع (ج.س)',
    orEnterAmount: 'أو أدخل مبلغاً آخر',
    anonymous: 'تبرع بشكل مجهول',
    continue: 'متابعة',
    back: 'رجوع',
    bankDetails: 'بيانات الحساب البنكي',
    accountName: 'اسم الحساب',
    accountNumber: 'رقم الحساب',
    bankName: 'البنك',
    copyNumber: 'نسخ الرقم',
    copied: 'تم النسخ',
    uploadReceipt: 'صورة إشعار التحويل',
    uploadHint: 'اضغط لتحميل صورة الإشعار البنكي',
    submitDonation: 'إرسال للتتحقق',
    submitting: 'جاري الإرسال...',
    donationPendingTitle: 'تم إرسال طلب التبرع',
    donationPendingMsg:
      'سيراجع المشرف إشعار التحويل. بعد التحقق يُضاف المبلغ للمشروع وتظهر الحالة «تم التحقق».',
    thankYou: 'جزاك الله خيراً!',
    statusPending: 'قيد التحقق',
    statusSuccess: 'تم التحقق',
    statusFailed: 'مرفوض',
    myProjects: 'مشاريعي',
    myDonations: 'تبرعاتي',
    overview: 'نظرة عامة',
    welcome: 'مرحباً',
    totalDonated: 'إجمالي تبرعاتك',
    projectsCreated: 'مشاريع أنشأتها',
    donationOps: 'عمليات تبرع',
    recentActivity: 'آخر النشاطات',
    noActivity: 'لا يوجد نشاط مؤخراً.',
    projectCol: 'المشروع',
    amountCol: 'المبلغ',
    dateCol: 'التاريخ',
    statusCol: 'الحالة',
    loading: 'جاري التحميل...',
    pleaseLogin: 'يرجى تسجيل الدخول',
    allRights: 'جميع الحقوق محفوظة',
    langSwitch: 'English',
    // Admin
    adminTitle: 'لوحة التحكم الاحترافية',
    adminSubtitle: 'إدارة كاملة للمنصة — للسوبر يوزر والمشرفين فقط',
    stats: 'الإحصائيات',
    pendingProjects: 'مشاريع قيد الموافقة',
    pendingDonations: 'تبرعات قيد التحقق',
    bankAccounts: 'الحسابات البنكية',
    users: 'المستخدمون',
    notifications: 'الإشعارات',
    reports: 'التقارير',
    printReport: 'طباعة التقرير',
    approve: 'موافقة',
    reject: 'رفض',
    deactivate: 'إيقاف',
    activate: 'تفعيل',
    verify: 'تحقق وإضافة',
    save: 'حفظ',
    addBank: 'إضافة حساب',
    noItems: 'لا توجد عناصر',
    markAllRead: 'تعليم الكل كمقروء',
    active: 'نشط',
    inactive: 'موقوف',
    completed: 'مكتمل',
    rejected: 'مرفوض',
    pending: 'قيد المراجعة',
  },
  en: {
    siteName: 'Aljasad Alwahid',
    home: 'Home',
    projects: 'Projects',
    about: 'About',
    login: 'Login',
    logout: 'Log out',
    startProject: 'Start a project',
    dashboard: 'Dashboard',
    adminPanel: 'Admin panel',
    donateNow: 'Donate now',
    donateToProject: 'Donate to project',
    chooseAmount: 'Choose donation amount (SDG)',
    orEnterAmount: 'Or enter another amount',
    anonymous: 'Donate anonymously',
    continue: 'Continue',
    back: 'Back',
    bankDetails: 'Bank account details',
    accountName: 'Account name',
    accountNumber: 'Account number',
    bankName: 'Bank',
    copyNumber: 'Copy number',
    copied: 'Copied',
    uploadReceipt: 'Transfer receipt image',
    uploadHint: 'Click to upload bank transfer receipt',
    submitDonation: 'Submit for verification',
    submitting: 'Submitting...',
    donationPendingTitle: 'Donation request submitted',
    donationPendingMsg:
      'An admin will review your receipt. After verification the amount is added to the project and status becomes “Verified”.',
    thankYou: 'Thank you!',
    statusPending: 'Under review',
    statusSuccess: 'Verified',
    statusFailed: 'Rejected',
    myProjects: 'My projects',
    myDonations: 'My donations',
    overview: 'Overview',
    welcome: 'Welcome',
    totalDonated: 'Total donated',
    projectsCreated: 'Projects created',
    donationOps: 'Donations',
    recentActivity: 'Recent activity',
    noActivity: 'No recent activity.',
    projectCol: 'Project',
    amountCol: 'Amount',
    dateCol: 'Date',
    statusCol: 'Status',
    loading: 'Loading...',
    pleaseLogin: 'Please sign in',
    allRights: 'All rights reserved',
    langSwitch: 'العربية',
    adminTitle: 'Professional Admin Panel',
    adminSubtitle: 'Full platform control — superusers & admins only',
    stats: 'Statistics',
    pendingProjects: 'Projects awaiting approval',
    pendingDonations: 'Donations under review',
    bankAccounts: 'Bank accounts',
    users: 'Users',
    notifications: 'Notifications',
    reports: 'Reports',
    printReport: 'Print report',
    approve: 'Approve',
    reject: 'Reject',
    deactivate: 'Deactivate',
    activate: 'Activate',
    verify: 'Verify & add',
    save: 'Save',
    addBank: 'Add account',
    noItems: 'No items',
    markAllRead: 'Mark all read',
    active: 'Active',
    inactive: 'Inactive',
    completed: 'Completed',
    rejected: 'Rejected',
    pending: 'Pending',
  },
} as const;

export type TranslationKey = keyof typeof translations.ar;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
  dir: 'rtl' | 'ltr';
  isAr: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const STORAGE_KEY = 'aljasad_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    return saved === 'en' || saved === 'ar' ? saved : 'ar';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const toggleLang = () => setLang(lang === 'ar' ? 'en' : 'ar');

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const value = useMemo<LanguageContextType>(
    () => ({
      lang,
      setLang,
      toggleLang,
      t: (key) => translations[lang][key] || translations.ar[key] || key,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      isAr: lang === 'ar',
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
