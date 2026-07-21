import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  adminApi,
  AdminDashboardStats,
  AdminNotification,
  AdminUser,
  ApiDonation,
  ApiProject,
  SiteBankAccount,
  AdminTransfer,
  AdminReport,
} from '../lib/api';
import {
  LayoutDashboard,
  FolderHeart,
  Heart,
  Users,
  Building2,
  Bell,
  FileBarChart,
  Check,
  X,
  Pause,
  Play,
  Printer,
  RefreshCw,
  Shield,
} from 'lucide-react';

type Tab =
  | 'overview'
  | 'projects'
  | 'donations'
  | 'transfers'
  | 'banks'
  | 'users'
  | 'notifications'
  | 'reports';

function statusBadge(status: string, isAr: boolean) {
  const map: Record<string, { bg: string; fg: string; ar: string; en: string }> = {
    pending: { bg: 'bg-amber-100', fg: 'text-amber-800', ar: 'قيد المراجعة', en: 'Pending' },
    active: { bg: 'bg-emerald-100', fg: 'text-emerald-800', ar: 'نشط', en: 'Active' },
    inactive: { bg: 'bg-slate-100', fg: 'text-slate-700', ar: 'موقوف', en: 'Inactive' },
    completed: { bg: 'bg-blue-100', fg: 'text-blue-800', ar: 'مكتمل', en: 'Completed' },
    rejected: { bg: 'bg-red-100', fg: 'text-red-800', ar: 'مرفوض', en: 'Rejected' },
    success: { bg: 'bg-emerald-100', fg: 'text-emerald-800', ar: 'تم التحقق', en: 'Verified' },
    failed: { bg: 'bg-red-100', fg: 'text-red-800', ar: 'مرفوض', en: 'Rejected' },
    approved: { bg: 'bg-emerald-100', fg: 'text-emerald-800', ar: 'مقبول', en: 'Approved' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.bg} ${s.fg}`}>
      {isAr ? s.ar : s.en}
    </span>
  );
}

const AdminPanel: React.FC = () => {
  const { user, profile } = useAuth();
  const { t, isAr } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [donations, setDonations] = useState<ApiDonation[]>([]);
  const [transfers, setTransfers] = useState<AdminTransfer[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [banks, setBanks] = useState<SiteBankAccount[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [busyId, setBusyId] = useState<string | number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    iban: '',
    instructions: '',
    isPrimary: false,
  });

  const isAdmin =
    user &&
    (user.isSuperuser || user.isStaff || user.role === 'admin' || profile?.role === 'admin');

  const loadOverview = useCallback(async () => {
    const [d, n] = await Promise.all([adminApi.dashboard(), adminApi.notifications()]);
    setStats(d);
    setNotifications(n.items);
    setUnread(n.unread);
  }, []);

  const refreshTab = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      if (tab === 'overview') await loadOverview();
      if (tab === 'projects') setProjects(await adminApi.projects());
      if (tab === 'donations') setDonations(await adminApi.donations());
      if (tab === 'transfers') setTransfers(await adminApi.transfers());
      if (tab === 'users') setUsers(await adminApi.users());
      if (tab === 'banks') setBanks(await adminApi.banks());
      if (tab === 'notifications') {
        const n = await adminApi.notifications();
        setNotifications(n.items);
        setUnread(n.unread);
      }
      if (tab === 'reports') setReport(await adminApi.reports());
    } catch (e) {
      console.error(e);
      setMsg(isAr ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tab, loadOverview, isAr]);

  useEffect(() => {
    if (isAdmin) refreshTab();
  }, [isAdmin, refreshTab]);

  if (!user) {
    return (
      <div className="p-20 text-center">
        <p className="mb-4 font-bold text-lg">{t('pleaseLogin')}</p>
        <Link to="/login" state={{ from: '/admin' }} className="btn-primary inline-block">
          {t('login')}
        </Link>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto py-24 px-4 text-center">
        <Shield className="mx-auto text-slate-300 mb-4" size={48} />
        <h1 className="text-2xl font-bold mb-2">
          {isAr ? 'غير مصرح' : 'Access denied'}
        </h1>
        <p className="text-slate-500 mb-6">
          {isAr
            ? 'هذه اللوحة للسوبر يوزر والمشرفين فقط.'
            : 'This panel is for superusers and admins only.'}
        </p>
        <Link to="/dashboard" className="btn-primary inline-block">
          {t('dashboard')}
        </Link>
      </div>
    );
  }

  const act = async (fn: () => Promise<unknown>, id?: string | number) => {
    setBusyId(id ?? 'x');
    try {
      await fn();
      setMsg(isAr ? 'تم بنجاح' : 'Done');
      await refreshTab();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId(null);
    }
  };

  const nav: { id: Tab; icon: React.ReactNode; label: string; badge?: number }[] = [
    { id: 'overview', icon: <LayoutDashboard size={18} />, label: t('overview') },
    {
      id: 'projects',
      icon: <FolderHeart size={18} />,
      label: isAr ? 'المشاريع' : 'Projects',
      badge: stats?.projects.pending,
    },
    {
      id: 'donations',
      icon: <Heart size={18} />,
      label: isAr ? 'التبرعات' : 'Donations',
      badge: stats?.donations.pending,
    },
    {
      id: 'transfers',
      icon: <Heart size={18} />,
      label: isAr ? 'تحويلات مباشرة' : 'Transfers',
      badge: stats?.transfers.pending,
    },
    { id: 'banks', icon: <Building2 size={18} />, label: t('bankAccounts') },
    { id: 'users', icon: <Users size={18} />, label: t('users') },
    {
      id: 'notifications',
      icon: <Bell size={18} />,
      label: t('notifications'),
      badge: unread || undefined,
    },
    { id: 'reports', icon: <FileBarChart size={18} />, label: t('reports') },
  ];

  const printReport = () => {
    const w = window.open('', '_blank');
    if (!w || !report) return;
    const rows = report.projects
      .map(
        (p) =>
          `<tr><td>${p.title}</td><td>${p.category}</td><td>${p.status}</td><td>${p.target}</td><td>${p.raised}</td><td>${p.progress}%</td></tr>`,
      )
      .join('');
    w.document.write(`<!DOCTYPE html><html dir="${isAr ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"/>
      <title>${report.siteName} — Report</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#0f172a}
        h1{margin:0 0 8px} .meta{color:#64748b;margin-bottom:24px}
        .cards{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px}
        .card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;min-width:140px}
        .card b{display:block;font-size:22px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #e2e8f0;padding:8px;text-align:start}
        th{background:#f8fafc}
        @media print{button{display:none}}
      </style></head><body>
      <button onclick="window.print()">${t('printReport')}</button>
      <h1>${report.siteName}</h1>
      <div class="meta">${new Date(report.generatedAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}</div>
      <div class="cards">
        <div class="card"><span>${isAr ? 'مشاريع' : 'Projects'}</span><b>${report.summary.projectsTotal}</b></div>
        <div class="card"><span>${isAr ? 'قيد الموافقة' : 'Pending'}</span><b>${report.summary.projectsPending}</b></div>
        <div class="card"><span>${isAr ? 'تبرعات موثقة' : 'Verified'}</span><b>${report.summary.donationsVerified}</b></div>
        <div class="card"><span>${isAr ? 'المجموع' : 'Raised'}</span><b>${report.summary.totalRaised.toLocaleString()}</b></div>
        <div class="card"><span>${isAr ? 'مستخدمون' : 'Users'}</span><b>${report.summary.usersTotal}</b></div>
      </div>
      <h2>${isAr ? 'المشاريع' : 'Projects'}</h2>
      <table><thead><tr>
        <th>${isAr ? 'العنوان' : 'Title'}</th><th>${isAr ? 'التصنيف' : 'Category'}</th>
        <th>${isAr ? 'الحالة' : 'Status'}</th><th>${isAr ? 'الهدف' : 'Target'}</th>
        <th>${isAr ? 'المجموع' : 'Raised'}</th><th>%</th>
      </tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    w.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sudan-green/10 text-sudan-green text-xs font-bold mb-2">
            <Shield size={14} />
            {user.isSuperuser ? 'SUPERUSER' : 'ADMIN'}
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{t('adminTitle')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('adminSubtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refreshTab()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 font-bold text-sm hover:bg-slate-200"
          >
            <RefreshCw size={16} />
            {isAr ? 'تحديث' : 'Refresh'}
          </button>
          <Link to="/dashboard" className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-sm">
            {t('dashboard')}
          </Link>
        </div>
      </div>

      {msg && (
        <div className="mb-4 p-3 rounded-xl bg-slate-900 text-white text-sm font-semibold">{msg}</div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-60 flex flex-col gap-1.5 shrink-0">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                tab === n.id
                  ? 'bg-sudan-green text-white shadow-lg shadow-sudan-green/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {n.icon}
              <span className="flex-1 text-start">{n.label}</span>
              {!!n.badge && n.badge > 0 && (
                <span
                  className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] flex items-center justify-center ${
                    tab === n.id ? 'bg-white text-sudan-green' : 'bg-sudan-red text-white'
                  }`}
                >
                  {n.badge}
                </span>
              )}
            </button>
          ))}
        </aside>

        <main className="flex-1 min-w-0">
          {loading && (
            <div className="text-center py-16 text-slate-400 font-bold">{t('loading')}</div>
          )}

          {!loading && tab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: isAr ? 'مشاريع نشطة' : 'Active projects',
                    value: stats.projects.active,
                    sub: `${stats.projects.pending} ${isAr ? 'بانتظار' : 'pending'}`,
                    color: 'border-emerald-500',
                  },
                  {
                    label: isAr ? 'تبرعات موثقة' : 'Verified donations',
                    value: stats.donations.verifiedSum.toLocaleString(),
                    sub: `${stats.donations.pending} ${isAr ? 'قيد التحقق' : 'pending'}`,
                    color: 'border-amber-500',
                  },
                  {
                    label: isAr ? 'تحويلات معلقة' : 'Pending transfers',
                    value: stats.transfers.pending,
                    sub: `${stats.transfers.pendingSum.toLocaleString()} SDG`,
                    color: 'border-red-500',
                  },
                  {
                    label: isAr ? 'المستخدمون' : 'Users',
                    value: stats.users.total,
                    sub: `${stats.users.staff} staff`,
                    color: 'border-blue-500',
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    className={`bg-white p-5 rounded-2xl border-t-4 ${c.color} card-shadow border border-slate-100`}
                  >
                    <div className="text-2xl font-bold text-slate-900">{c.value}</div>
                    <div className="text-sm font-bold text-slate-700 mt-1">{c.label}</div>
                    <div className="text-xs text-slate-400 mt-1">{c.sub}</div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-100 card-shadow">
                <h3 className="font-bold text-lg mb-4">{isAr ? 'حسب التصنيف' : 'By category'}</h3>
                <div className="space-y-2">
                  {stats.byCategory.map((c) => (
                    <div
                      key={c.category}
                      className="flex justify-between items-center py-2 border-b border-slate-50 text-sm"
                    >
                      <span className="font-bold">{c.category}</span>
                      <span className="text-slate-500">
                        {c.count} · {c.raised.toLocaleString()} SDG
                      </span>
                    </div>
                  ))}
                  {stats.byCategory.length === 0 && (
                    <p className="text-slate-400 text-sm">{t('noItems')}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && tab === 'projects' && (
            <div className="bg-white rounded-2xl border border-slate-100 card-shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-bold">
                {t('pendingProjects')} / {isAr ? 'كل المشاريع' : 'All projects'}
              </div>
              <div className="divide-y divide-slate-50">
                {projects.map((p) => (
                  <div key={p.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 truncate">{p.title}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {p.category} · {p.creatorName} ·{' '}
                        {Number(p.currentAmount).toLocaleString()} /{' '}
                        {Number(p.targetAmount).toLocaleString()} SDG
                      </div>
                      <div className="mt-2">{statusBadge(p.status, isAr)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.status === 'pending' && (
                        <>
                          <button
                            disabled={busyId === p.id}
                            onClick={() =>
                              act(() => adminApi.projectAction(p.id, 'approve'), p.id)
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                          >
                            <Check size={14} /> {t('approve')}
                          </button>
                          <button
                            disabled={busyId === p.id}
                            onClick={() =>
                              act(() => adminApi.projectAction(p.id, 'reject'), p.id)
                            }
                            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1"
                          >
                            <X size={14} /> {t('reject')}
                          </button>
                        </>
                      )}
                      {p.status === 'active' && (
                        <button
                          disabled={busyId === p.id}
                          onClick={() =>
                            act(() => adminApi.projectAction(p.id, 'deactivate'), p.id)
                          }
                          className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Pause size={14} /> {t('deactivate')}
                        </button>
                      )}
                      {(p.status === 'inactive' || p.status === 'rejected') && (
                        <button
                          disabled={busyId === p.id}
                          onClick={() =>
                            act(() => adminApi.projectAction(p.id, 'activate'), p.id)
                          }
                          className="px-3 py-1.5 rounded-lg bg-sudan-green text-white text-xs font-bold flex items-center gap-1"
                        >
                          <Play size={14} /> {t('activate')}
                        </button>
                      )}
                      <Link
                        to={`/projects/${p.id}`}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold"
                      >
                        {isAr ? 'عرض' : 'View'}
                      </Link>
                    </div>
                  </div>
                ))}
                {projects.length === 0 && (
                  <div className="p-12 text-center text-slate-400 font-bold">{t('noItems')}</div>
                )}
              </div>
            </div>
          )}

          {!loading && tab === 'donations' && (
            <div className="bg-white rounded-2xl border border-slate-100 card-shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 font-bold">
                {t('pendingDonations')}
              </div>
              <div className="divide-y divide-slate-50">
                {donations.map((d) => (
                  <div key={d.id} className="p-5 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="font-bold">
                        {Number(d.amount).toLocaleString()} SDG → {d.projectTitle}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {d.donorName} · {d.bankAccountName || '—'} ·{' '}
                        {new Date(d.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        {statusBadge(d.status, isAr)}
                        {d.receiptImage && (
                          <a
                            href={d.receiptImage}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-bold text-sudan-green underline"
                          >
                            {isAr ? 'عرض الإشعار' : 'View receipt'}
                          </a>
                        )}
                      </div>
                      {d.receiptImage && d.receiptImage.startsWith('data:') && (
                        <img
                          src={d.receiptImage}
                          alt=""
                          className="mt-2 w-28 h-28 object-cover rounded-xl border"
                        />
                      )}
                    </div>
                    {d.status === 'pending' && (
                      <div className="flex gap-2 items-start">
                        <button
                          disabled={busyId === d.id}
                          onClick={() =>
                            act(() => adminApi.donationAction(d.id, 'approve'), d.id)
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                        >
                          {t('verify')}
                        </button>
                        <button
                          disabled={busyId === d.id}
                          onClick={() =>
                            act(() => adminApi.donationAction(d.id, 'reject'), d.id)
                          }
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"
                        >
                          {t('reject')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {donations.length === 0 && (
                  <div className="p-12 text-center text-slate-400 font-bold">{t('noItems')}</div>
                )}
              </div>
            </div>
          )}

          {!loading && tab === 'transfers' && (
            <div className="bg-white rounded-2xl border border-slate-100 card-shadow overflow-hidden">
              <div className="px-6 py-4 border-b font-bold">
                {isAr ? 'التحويلات المباشرة' : 'Direct transfers'}
              </div>
              <div className="divide-y">
                {transfers.map((tr) => (
                  <div key={tr.id} className="p-5 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="font-bold">
                        {tr.amount.toLocaleString()} — {tr.donationType}
                      </div>
                      <div className="text-xs text-slate-500">
                        {tr.donorName} · {tr.bankAccountName}
                      </div>
                      <div className="mt-2">{statusBadge(tr.status, isAr)}</div>
                      {tr.receiptImage && (
                        <img
                          src={tr.receiptImage}
                          alt=""
                          className="mt-2 w-28 h-28 object-cover rounded-xl border"
                        />
                      )}
                    </div>
                    {tr.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            act(() => adminApi.transferAction(tr.id, 'approve'), tr.id)
                          }
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                        >
                          {t('approve')}
                        </button>
                        <button
                          onClick={() =>
                            act(() => adminApi.transferAction(tr.id, 'reject'), tr.id)
                          }
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold"
                        >
                          {t('reject')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {transfers.length === 0 && (
                  <div className="p-12 text-center text-slate-400 font-bold">{t('noItems')}</div>
                )}
              </div>
            </div>
          )}

          {!loading && tab === 'banks' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-100 p-6 card-shadow">
                <h3 className="font-bold mb-4">{t('addBank')}</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {(
                    [
                      ['bankName', isAr ? 'اسم البنك' : 'Bank name'],
                      ['accountName', isAr ? 'اسم الحساب' : 'Account name'],
                      ['accountNumber', isAr ? 'رقم الحساب' : 'Account number'],
                      ['iban', 'IBAN'],
                    ] as const
                  ).map(([key, label]) => (
                    <input
                      key={key}
                      placeholder={label}
                      value={bankForm[key]}
                      onChange={(e) => setBankForm({ ...bankForm, [key]: e.target.value })}
                      className="px-4 py-3 bg-slate-50 rounded-xl font-semibold text-sm outline-none focus:ring-2 focus:ring-sudan-green"
                    />
                  ))}
                  <textarea
                    placeholder={isAr ? 'تعليمات التحويل' : 'Transfer instructions'}
                    value={bankForm.instructions}
                    onChange={(e) => setBankForm({ ...bankForm, instructions: e.target.value })}
                    className="md:col-span-2 px-4 py-3 bg-slate-50 rounded-xl font-semibold text-sm outline-none focus:ring-2 focus:ring-sudan-green"
                  />
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={bankForm.isPrimary}
                      onChange={(e) => setBankForm({ ...bankForm, isPrimary: e.target.checked })}
                    />
                    {isAr ? 'الحساب الرئيسي' : 'Primary account'}
                  </label>
                </div>
                <button
                  className="mt-4 btn-primary text-sm"
                  onClick={() =>
                    act(async () => {
                      await adminApi.createBank({
                        bankName: bankForm.bankName,
                        accountName: bankForm.accountName,
                        accountNumber: bankForm.accountNumber,
                        iban: bankForm.iban,
                        instructions: bankForm.instructions,
                        isPrimary: bankForm.isPrimary,
                        isActive: true,
                        currency: 'SDG',
                        branch: '',
                        sortOrder: 0,
                      });
                      setBankForm({
                        bankName: '',
                        accountName: '',
                        accountNumber: '',
                        iban: '',
                        instructions: '',
                        isPrimary: false,
                      });
                    })
                  }
                >
                  {t('save')}
                </button>
              </div>

              <div className="bg-white rounded-2xl border overflow-hidden card-shadow">
                {banks.map((b) => (
                  <div
                    key={b.id}
                    className="p-5 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold">
                        {b.bankName}{' '}
                        {b.isPrimary && (
                          <span className="text-xs bg-sudan-gold/20 text-amber-800 px-2 py-0.5 rounded-full">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600 font-mono" dir="ltr">
                        {b.accountNumber}
                      </div>
                      <div className="text-xs text-slate-400">{b.accountName}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          act(() =>
                            adminApi.updateBank(b.id, {
                              isActive: !b.isActive,
                              bankName: b.bankName,
                              accountName: b.accountName,
                              accountNumber: b.accountNumber,
                            }),
                          )
                        }
                        className="px-3 py-1.5 rounded-lg border text-xs font-bold"
                      >
                        {b.isActive ? t('deactivate') : t('activate')}
                      </button>
                      <button
                        onClick={() => act(() => adminApi.deleteBank(b.id))}
                        className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-bold"
                      >
                        {isAr ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
                {banks.length === 0 && (
                  <div className="p-12 text-center text-slate-400 font-bold">{t('noItems')}</div>
                )}
              </div>
            </div>
          )}

          {!loading && tab === 'users' && (
            <div className="bg-white rounded-2xl border overflow-hidden card-shadow">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-start font-bold">Email</th>
                      <th className="px-4 py-3 text-start font-bold">{isAr ? 'الاسم' : 'Name'}</th>
                      <th className="px-4 py-3 text-start font-bold">{isAr ? 'الدور' : 'Role'}</th>
                      <th className="px-4 py-3 text-start font-bold">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="px-4 py-3 text-start font-bold">{isAr ? 'إجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((u) => (
                      <tr key={u.uid} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold">{u.email}</td>
                        <td className="px-4 py-3">{u.displayName}</td>
                        <td className="px-4 py-3">
                          {u.isSuperuser ? 'superuser' : u.role}
                          {u.isStaff && !u.isSuperuser ? ' · staff' : ''}
                        </td>
                        <td className="px-4 py-3">
                          {u.isActive ? (
                            <span className="text-emerald-600 font-bold text-xs">
                              {isAr ? 'نشط' : 'Active'}
                            </span>
                          ) : (
                            <span className="text-red-600 font-bold text-xs">
                              {isAr ? 'معطّل' : 'Disabled'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() =>
                                act(
                                  () =>
                                    adminApi.updateUser(u.uid, { isActive: !u.isActive }),
                                  u.uid,
                                )
                              }
                              className="px-2 py-1 rounded-lg border text-xs font-bold"
                            >
                              {u.isActive ? t('deactivate') : t('activate')}
                            </button>
                            {user.isSuperuser && !u.isSuperuser && (
                              <button
                                onClick={() =>
                                  act(
                                    () =>
                                      adminApi.updateUser(u.uid, {
                                        role: u.role === 'admin' ? 'user' : 'admin',
                                      }),
                                    u.uid,
                                  )
                                }
                                className="px-2 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold"
                              >
                                {u.role === 'admin'
                                  ? isAr
                                    ? 'إزالة مشرف'
                                    : 'Demote'
                                  : isAr
                                    ? 'تعيين مشرف'
                                    : 'Make admin'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && tab === 'notifications' && (
            <div className="bg-white rounded-2xl border card-shadow overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <span className="font-bold">
                  {t('notifications')} ({unread})
                </span>
                <button
                  onClick={() => act(() => adminApi.markNotificationsRead({ all: true }))}
                  className="text-xs font-bold text-sudan-green"
                >
                  {t('markAllRead')}
                </button>
              </div>
              <div className="divide-y">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 ${n.isRead ? 'opacity-60' : 'bg-amber-50/40'}`}
                  >
                    <div className="font-bold text-sm">{n.title}</div>
                    <div className="text-xs text-slate-500 mt-1">{n.message}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {new Date(n.createdAt).toLocaleString(isAr ? 'ar-EG' : 'en-GB')}
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="p-12 text-center text-slate-400 font-bold">{t('noItems')}</div>
                )}
              </div>
            </div>
          )}

          {!loading && tab === 'reports' && report && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{t('reports')}</h2>
                <button
                  onClick={printReport}
                  className="flex items-center gap-2 btn-primary text-sm"
                >
                  <Printer size={16} />
                  {t('printReport')}
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(report.summary).map(([k, v]) => (
                  <div key={k} className="bg-white p-4 rounded-xl border card-shadow">
                    <div className="text-xl font-bold">
                      {typeof v === 'number' ? v.toLocaleString() : v}
                    </div>
                    <div className="text-[11px] text-slate-500 font-bold mt-1 break-all">{k}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border overflow-x-auto card-shadow">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-start">{isAr ? 'المشروع' : 'Project'}</th>
                      <th className="px-4 py-3 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="px-4 py-3 text-start">{isAr ? 'الهدف' : 'Target'}</th>
                      <th className="px-4 py-3 text-start">{isAr ? 'المجموع' : 'Raised'}</th>
                      <th className="px-4 py-3 text-start">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.projects.slice(0, 50).map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2 font-semibold">{p.title}</td>
                        <td className="px-4 py-2">{statusBadge(p.status, isAr)}</td>
                        <td className="px-4 py-2">{p.target.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sudan-green font-bold">
                          {p.raised.toLocaleString()}
                        </td>
                        <td className="px-4 py-2">{p.progress}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
