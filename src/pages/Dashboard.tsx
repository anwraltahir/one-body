import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Project, Donation } from '../types';
import { motion } from 'motion/react';
import { LayoutDashboard, Heart, FolderHeart, Settings, TrendingUp, Clock } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'donations'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Fetch my projects
        const pq = query(collection(db, 'projects'), where('creatorId', '==', user.uid), orderBy('createdAt', 'desc'));
        const pSnap = await getDocs(pq);
        setMyProjects(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));

        // Fetch my donations
        const dq = query(collection(db, 'donations'), where('donorId', '==', user.uid), orderBy('createdAt', 'desc'));
        const dSnap = await getDocs(dq);
        setMyDonations(dSnap.docs.map(d => ({ id: d.id, ...d.data() } as Donation)));
      } catch (error) {
        console.error('Error fetching dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user) return <div className="p-20 text-center">يرجى تسجيل الدخول</div>;

  const totalDonated = myDonations.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col section-gap">
      <div className="flex flex-col md:flex-row gap-10">
        {/* Sidebar */}
        <aside className="w-full md:w-64 flex flex-col gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'overview' ? 'bg-sudan-green text-white shadow-lg shadow-sudan-green/20' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard size={20} />
            <span>نظرة عامة</span>
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'projects' ? 'bg-sudan-green text-white shadow-lg shadow-sudan-green/20' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <FolderHeart size={20} />
            <span>مشاريعي</span>
          </button>
          <button
            onClick={() => setActiveTab('donations')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-xl font-bold transition-all ${
              activeTab === 'donations' ? 'bg-sudan-green text-white shadow-lg shadow-sudan-green/20' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <Heart size={20} />
            <span>تبرعاتي</span>
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-grow flex flex-col section-gap">
          {activeTab === 'overview' && (
            <div className="flex flex-col section-gap">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-3xl card-shadow border border-slate-100">
                  <div className="w-12 h-12 bg-sudan-green/10 text-sudan-green rounded-2xl flex items-center justify-center mb-6">
                    <TrendingUp size={24} />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{totalDonated.toLocaleString()} ج.س</div>
                  <div className="text-sm text-slate-500 font-bold mt-1">إجمالي تبرعاتك</div>
                </div>
                <div className="bg-white p-8 rounded-3xl card-shadow border border-slate-100">
                  <div className="w-12 h-12 bg-sudan-gold/10 text-sudan-gold rounded-2xl flex items-center justify-center mb-6">
                    <FolderHeart size={24} />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{myProjects.length}</div>
                  <div className="text-sm text-slate-500 font-bold mt-1">مشاريع أنشأتها</div>
                </div>
                <div className="bg-white p-8 rounded-3xl card-shadow border border-slate-100">
                  <div className="w-12 h-12 bg-sudan-red/10 text-sudan-red rounded-2xl flex items-center justify-center mb-6">
                    <Heart size={24} />
                  </div>
                  <div className="text-3xl font-bold text-slate-900">{myDonations.length}</div>
                  <div className="text-sm text-slate-500 font-bold mt-1">عمليات تبرع</div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-8 card-shadow border border-slate-100">
                <h3 className="text-2xl font-bold text-slate-900 mb-8">آخر النشاطات</h3>
                {myDonations.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {myDonations.slice(0, 5).map(d => (
                      <div key={d.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-sudan-green shadow-sm">
                            <Clock size={24} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-lg">تبرع لمشروع: {d.projectTitle}</div>
                            <div className="text-sm text-slate-500 font-semibold">{d.createdAt?.toDate().toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="font-bold text-sudan-green text-xl">+{d.amount.toLocaleString()} ج.س</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 font-bold">لا يوجد نشاط مؤخراً.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="flex flex-col gap-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-slate-900">مشاريعي الخيرية</h2>
                <Link to="/create-project" className="btn-primary">مشروع جديد</Link>
              </div>
              {myProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {myProjects.map(p => (
                    <ProjectCard key={p.id} project={p} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-slate-200 card-shadow">
                  <p className="text-slate-500 font-bold text-lg">لم تقم بإنشاء أي مشاريع بعد.</p>
                  <Link to="/create-project" className="btn-primary mt-6 inline-block">ابدأ أول مشروع لك</Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'donations' && (
            <div className="flex flex-col gap-8">
              <h2 className="text-3xl font-bold text-slate-900">سجل تبرعاتي</h2>
              <div className="bg-white rounded-3xl overflow-hidden card-shadow border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-8 py-5 text-sm font-bold text-slate-600">المشروع</th>
                        <th className="px-8 py-5 text-sm font-bold text-slate-600">المبلغ</th>
                        <th className="px-8 py-5 text-sm font-bold text-slate-600">التاريخ</th>
                        <th className="px-8 py-5 text-sm font-bold text-slate-600">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myDonations.map(d => (
                        <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-5 font-bold text-slate-900">{d.projectTitle}</td>
                          <td className="px-8 py-5 font-bold text-sudan-green">{d.amount.toLocaleString()} ج.س</td>
                          <td className="px-8 py-5 text-sm text-slate-500 font-semibold">{d.createdAt?.toDate().toLocaleDateString()}</td>
                          <td className="px-8 py-5">
                            <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold">ناجحة</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {myDonations.length === 0 && (
                  <div className="text-center py-32 text-slate-500 font-bold">لا يوجد سجل تبرعات حالياً.</div>
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
