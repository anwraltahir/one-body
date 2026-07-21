import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsApi, donationsApi } from '../lib/api';
import { Project, Donation, formatDate } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Share2, ShieldCheck, ArrowRight, Heart, Check, Link2 } from 'lucide-react';
import DonationModal from '../components/DonationModal';

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const ProjectDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared' | 'error'>('idle');
  const [sharing, setSharing] = useState(false);

  const fetchProjectData = useCallback(async () => {
    if (!id) return;
    try {
      const [proj, dons] = await Promise.all([
        projectsApi.get(id),
        donationsApi.list(id),
      ]);
      setProject(proj as Project);
      setDonations((dons as Donation[]).slice(0, 5));
    } catch (error) {
      console.error('Error fetching project', error);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    fetchProjectData();
  }, [fetchProjectData]);

  const handleShare = useCallback(async () => {
    if (!project || sharing) return;

    const url = `${window.location.origin}/projects/${project.id}`;
    const title = project.title;
    const text = `ساهم في مشروع «${project.title}» على منصة الجسد الواحد`;

    setSharing(true);
    try {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, text, url });
          setShareStatus('shared');
          setTimeout(() => setShareStatus('idle'), 2500);
          return;
        } catch (err) {
          // User cancelled share sheet — don't treat as hard error
          if (err instanceof DOMException && err.name === 'AbortError') {
            return;
          }
          // fall through to clipboard
        }
      }

      const ok = await copyText(url);
      if (ok) {
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2500);
      } else {
        setShareStatus('error');
        setTimeout(() => setShareStatus('idle'), 3000);
      }
    } finally {
      setSharing(false);
    }
  }, [project, sharing]);

  if (loading) return <div className="max-w-7xl mx-auto px-4 py-20 text-center">جاري التحميل...</div>;
  if (!project) return <div className="max-w-7xl mx-auto px-4 py-20 text-center">المشروع غير موجود</div>;

  const progress = Math.min((Number(project.currentAmount) / Number(project.targetAmount)) * 100, 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-sudan-green mb-8 transition-colors"
      >
        <ArrowRight size={20} />
        <span>العودة للمشاريع</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-100 bg-white">
            <div className="w-full h-[300px] bg-slate-50 flex items-center justify-center border-b border-slate-100">
              <div className="text-7xl">
                {project.category === 'مياه وآبار' && '💧'}
                {project.category === 'مساجد' && '🕌'}
                {project.category === 'دعم التعليم' && '🎓'}
                {project.category === 'الصحة' && '⚕️'}
                {['زكاة مال', 'زكاة فطر', 'فدية صيام'].includes(project.category) && '🌾'}
              </div>
            </div>
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-sudan-green/10 text-sudan-green px-4 py-1 rounded-full text-sm font-bold">
                  {project.category}
                </span>
                <span className="text-slate-400 text-sm flex items-center gap-1">
                  <Calendar size={14} />
                  {formatDate(project.createdAt)}
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

          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-6">آخر التبرعات</h3>
            {donations.length > 0 ? (
              <div className="space-y-4">
                {donations.map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-sudan-green shadow-sm">
                        <Heart size={20} fill={donation.isAnonymous ? 'none' : 'currentColor'} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          {donation.isAnonymous ? 'فاعل خير' : donation.donorName || 'فاعل خير'}
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(donation.createdAt)}</div>
                      </div>
                    </div>
                    <div className="text-lg font-bold text-sudan-green">
                      {Number(donation.amount).toLocaleString()} ج.س
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">لا توجد تبرعات بعد. كن أول المتبرعين!</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl sticky top-24">
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-bold text-sudan-green">
                  {Number(project.currentAmount).toLocaleString()}
                </span>
                <span className="text-slate-500 text-sm">
                  من {Number(project.targetAmount).toLocaleString()} ج.س
                </span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="bg-sudan-green h-full rounded-full"
                />
              </div>
              <div className="text-sm font-bold text-sudan-green text-left">
                {Math.round(progress)}% مكتمل
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="text-center p-4 bg-slate-50 rounded-2xl">
                <div className="text-2xl font-bold text-slate-900">{project.donorCount}</div>
                <div className="text-xs text-slate-500">متبرع</div>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-2xl">
                <div className="text-2xl font-bold text-slate-900">
                  {Math.max(0, Number(project.targetAmount) - Number(project.currentAmount)).toLocaleString()}
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

            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="w-full py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {shareStatus === 'copied' || shareStatus === 'shared' ? (
                <>
                  <Check size={20} className="text-sudan-green" />
                  {shareStatus === 'shared' ? 'تمت المشاركة' : 'تم نسخ الرابط'}
                </>
              ) : shareStatus === 'error' ? (
                <>
                  <Link2 size={20} className="text-sudan-red" />
                  تعذّرت المشاركة — انسخ الرابط يدوياً
                </>
              ) : (
                <>
                  <Share2 size={20} />
                  مشاركة المشروع
                </>
              )}
            </button>
            {shareStatus === 'error' && (
              <p className="mt-2 text-xs text-center text-slate-500 break-all dir-ltr">
                {`${window.location.origin}/projects/${project.id}`}
              </p>
            )}

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
