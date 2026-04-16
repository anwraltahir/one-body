import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Project, Donation } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Users, Target, Share2, ShieldCheck, ArrowRight, Heart } from 'lucide-react';
import DonationModal from '../components/DonationModal';

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDonateModal, setShowDonateModal] = useState(false);

  const fetchProjectData = async () => {
    if (!id) return;
    try {
      const docSnap = await getDoc(doc(db, 'projects', id));
      if (docSnap.exists()) {
        setProject({ id: docSnap.id, ...docSnap.data() } as Project);
        
        // Fetch recent donations
        const q = query(
          collection(db, 'donations'),
          where('projectId', '==', id),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const donationSnap = await getDocs(q);
        setDonations(donationSnap.docs.map(d => ({ id: d.id, ...d.data() } as Donation)));
      }
    } catch (error) {
      console.error('Error fetching project', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center">جاري التحميل...</div>;
  if (!project) return <div className="max-w-7xl mx-auto px-4 py-20 text-center">المشروع غير موجود</div>;

  const progress = Math.min((project.currentAmount / project.targetAmount) * 100, 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link to="/projects" className="inline-flex items-center gap-2 text-slate-500 hover:text-sudan-green mb-8 transition-colors">
        <ArrowRight size={20} />
        <span>العودة للمشاريع</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-10">
          <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-100 bg-white">
            <img
              src={project.imageUrl || `https://picsum.photos/seed/${project.id}/1200/600`}
              className="w-full h-[400px] object-cover"
              alt={project.title}
              referrerPolicy="no-referrer"
            />
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-sudan-green/10 text-sudan-green px-4 py-1 rounded-full text-sm font-bold">
                  {project.category}
                </span>
                <span className="text-slate-400 text-sm flex items-center gap-1">
                  <Calendar size={14} />
                  {project.createdAt?.toDate().toLocaleDateString('ar-EG')}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-6">{project.title}</h1>
              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </p>
              </div>
            </div>
          </div>

          {/* Recent Donations */}
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6">آخر التبرعات</h3>
            {donations.length > 0 ? (
              <div className="space-y-4">
                {donations.map((donation) => (
                  <div key={donation.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-sudan-green shadow-sm">
                        <Heart size={20} fill={donation.isAnonymous ? 'none' : 'currentColor'} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{donation.donorName}</div>
                        <div className="text-xs text-slate-500">{donation.createdAt?.toDate().toLocaleDateString('ar-EG')}</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-sudan-green">
                      {donation.amount.toLocaleString()} ج.س
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">لا توجد تبرعات بعد. كن أول المتبرعين!</p>
            )}
          </div>
        </div>

        {/* Sidebar / Donation Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl sticky top-24">
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-bold text-sudan-green">{project.currentAmount.toLocaleString()}</span>
                <span className="text-slate-500 text-sm">من {project.targetAmount.toLocaleString()} ج.س</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="bg-sudan-green h-full rounded-full"
                />
              </div>
              <div className="text-sm font-bold text-sudan-green text-left">{Math.round(progress)}% مكتمل</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="text-center p-4 bg-slate-50 rounded-2xl">
                <div className="text-2xl font-bold text-slate-900">{project.donorCount}</div>
                <div className="text-xs text-slate-500">متبرع</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-2xl">
                <div className="text-2xl font-bold text-slate-900">
                  {Math.max(0, project.targetAmount - project.currentAmount).toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">متبقي</div>
              </div>
            </div>

            <button
              onClick={() => setShowDonateModal(true)}
              className="w-full py-4 bg-sudan-green text-white rounded-2xl font-bold text-xl hover:bg-opacity-90 transition-all shadow-lg mb-4 flex items-center justify-center gap-2"
            >
              <Heart size={24} fill="currentColor" />
              تبرع الآن
            </button>

            <button className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
              <Share2 size={20} />
              مشاركة المشروع
            </button>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-3 text-slate-600">
                <ShieldCheck className="text-sudan-gold" size={20} />
                <div className="text-xs leading-relaxed">
                  هذا المشروع موثق من قبل منصة الجسد الواحد. جميع التبرعات تذهب مباشرة لمصارفها المحددة.
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-sudan-red/5 p-6 rounded-3xl border border-sudan-red/10">
            <h4 className="font-bold text-sudan-red mb-2">هل تعلم؟</h4>
            <p className="text-sm text-slate-700 leading-relaxed">
              الصدقة تطفئ غضب الرب وتدفع ميتة السوء. مساهمتك البسيطة قد تكون سبباً في تفريج كربة أخ لك.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showDonateModal && (
          <DonationModal
            project={project}
            onClose={() => setShowDonateModal(false)}
            onSuccess={fetchProjectData}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProjectDetails;
