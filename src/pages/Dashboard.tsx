import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi, donationsApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Project, Donation, formatDate } from '../types';
import { LayoutDashboard, Heart, FolderHeart, TrendingUp, Clock, Shield } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { t, isAr } = useLanguage();
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'donations'>('overview');

  const isAdmin =
    user &&
    (user.isSuperuser || user.isStaff || user.role === 'admin' || profile?.role === 'admin');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [projects, donations] = await Promise.all([
          projectsApi.mine(),
          donationsApi.mine(),
        ]);
        setMyProjects(projects as Project[]);
        setMyDonations(donations as Donation[]);
      } catch (error) {
        console.error('Error fetching dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="p-20 text-center">
        <p className="mb-4 font-bold text-lg">{t('pleaseLogin')}</p>
        <Link to="/login" state={{ from: '/dashboard' }} className="btn-primary inline-block">
          {t('login')}
        </Link>
      </div>
    );
  }

  const totalDonated = myDonations
    .filter((d) => d.status === 'success')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const statusLabel = (s: string) => {
    if (s === 'pending') return t('statusPending');
    if (s === 'success') return t('statusSuccess');
    if (s === 'failed') return t('statusFailed');
    return s;
  };

  const statusClass = (s: string) => {
    if (s === 'pending') return 'bg-amber-100 text-amber-800';
    if (s === 'success') return 'bg-green-100 text-green-700';
    if (s === 'failed') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col section-gap">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('welcome')}، {profile?.displayName || user.email}
          </h1>
          <p className="text-slate-500 text-sm">{user.email}</p>
        </div>
        {isAdmin && (
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800"
          >
            <Shield size={18} />
            {t('adminPanel')}
          </Link>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        <aside className="w-full md:w-64 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-sudan-green text-white shadow-lg shadow-sudan-green/20'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard size={20} />
            <span>{t('overview')}</span>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'projects'
                ? 'bg-sudan-green text-white shadow-lg shadow-sudan-green/20'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <FolderHeart size={20} />
            <span>{t('myProjects')}</span>
          </button>
          <button
            onClick={() => setActiveTab('donations')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'donations'
                ? 'bg-sudan-green text-white shadow-lg shadow-sudan-green/20'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Heart size={20} />
            <span>{t('myDonations')}</span>
          </button>
        </aside>

        <main className="flex-grow flex flex-col section-gap">
          {loading && (
            <div className="text-center py-12 text-slate-400 font-bold">{t('loading')}</div>
          )}

          {!loading && activeTab === 'overview' && (
            <div className="flex flex-col section-gap">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl card-shadow border border-slate-100">
                  <div className="w-12 h-12 bg-sudan-green/10 text-sudan-green rounded-2xl flex items-center justify-center mb-6">
                    <TrendingUp size={24} />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">
                    {totalDonated.toLocaleString()} {isAr ? 'ج.س' : 'SDG'}
                  </div>
                  <div className="text-sm text-slate-500 font-bold mt-1">{t('totalDonated')}</div>
                </div>
                <div className="bg-white p-8 rounded-3xl card-shadow border border-slate-100">
                  <div className="w-12 h-12 bg-sudan-gold/10 text-sudan-gold rounded-2xl flex items-center justify-center mb-6">
                    <FolderHeart size={24} />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{myProjects.length}</div>
                  <div className="text-sm text-slate-500 font-bold mt-1">{t('projectsCreated')}</div>
                </div>
                <div className="bg-white p-8 rounded-3xl card-shadow border border-slate-100">
                  <div className="w-12 h-12 bg-sudan-red/10 text-sudan-red rounded-2xl flex items-center justify-center mb-6">
                    <Heart size={24} />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{myDonations.length}</div>
                  <div className="text-sm text-slate-500 font-bold mt-1">{t('donationOps')}</div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 card-shadow border border-slate-100">
                <h3 className="text-2xl font-bold text-slate-900 mb-8">{t('recentActivity')}</h3>
                {myDonations.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {myDonations.slice(0, 5).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 gap-3"
                      >
                        <div className="flex items-center gap-5 min-w-0">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-sudan-green shadow-sm shrink-0">
                            <Clock size={24} />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-lg truncate">
                              {d.projectTitle}
                            </div>
                            <div className="text-sm text-slate-500 font-semibold flex items-center gap-2 flex-wrap">
                              {formatDate(d.createdAt)}
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusClass(d.status)}`}>
                                {statusLabel(d.status)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="font-bold text-sudan-green text-xl shrink-0">
                          +{Number(d.amount).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 font-bold">{t('noActivity')}</div>
                )}
              </div>
            </div>
          )}

          {!loading && activeTab === 'projects' && (
            <div className="flex flex-col gap-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-900">{t('myProjects')}</h2>
                <Link to="/create-project" className="btn-primary">
                  {t('startProject')}
                </Link>
              </div>
              {myProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {myProjects.map((p) => (
                    <div key={p.id} className="relative">
                      <ProjectCard project={p} />
                      <div className="absolute top-3 left-3 z-10">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold shadow ${
                            p.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : p.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'inactive'
                                  ? 'bg-slate-200 text-slate-700'
                                  : p.status === 'rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {p.status === 'pending'
                            ? t('pending')
                            : p.status === 'active'
                              ? t('active')
                              : p.status === 'inactive'
                                ? t('inactive')
                                : p.status === 'rejected'
                                  ? t('rejected')
                                  : t('completed')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-slate-200 card-shadow">
                  <p className="text-slate-500 font-bold text-lg">{t('noItems')}</p>
                  <Link to="/create-project" className="btn-primary mt-6 inline-block">
                    {t('startProject')}
                  </Link>
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === 'donations' && (
            <div className="flex flex-col gap-8">
              <h2 className="text-3xl font-bold text-slate-900">{t('myDonations')}</h2>
              <div className="bg-white rounded-3xl overflow-hidden card-shadow border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-start">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-5 text-sm font-bold text-slate-600">{t('projectCol')}</th>
                        <th className="px-8 py-5 text-sm font-bold text-slate-600">{t('amountCol')}</th>
                        <th className="px-8 py-5 text-sm font-bold text-slate-600">{t('dateCol')}</th>
                        <th className="px-8 py-5 text-sm font-bold text-slate-600">{t('statusCol')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myDonations.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5 font-bold text-slate-900">{d.projectTitle}</td>
                          <td className="px-8 py-5 font-bold text-sudan-green">
                            {Number(d.amount).toLocaleString()} {isAr ? 'ج.س' : 'SDG'}
                          </td>
                          <td className="px-8 py-5 text-sm text-slate-500 font-semibold">
                            {formatDate(d.createdAt)}
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${statusClass(d.status)}`}>
                              {statusLabel(d.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {myDonations.length === 0 && (
                  <div className="text-center py-32 text-slate-500 font-bold">{t('noItems')}</div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
