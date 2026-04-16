import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, serverTimestamp } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { ProjectCategory } from '../types';
import { motion } from 'motion/react';
import { Upload, Info, Lock, Globe, AlertCircle } from 'lucide-react';

const categories: ProjectCategory[] = ['مياه وآبار', 'مساجد', 'زكاة مال', 'زكاة فطر', 'فدية صيام', 'دعم التعليم', 'الصحة'];

const CreateProject: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'مياه وآبار' as ProjectCategory,
    targetAmount: '',
    isPublic: true,
    imageUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const projectData = {
        ...formData,
        targetAmount: Number(formData.targetAmount),
        currentAmount: 0,
        creatorId: user.uid,
        creatorName: profile?.displayName || 'مستخدم',
        status: 'pending',
        createdAt: serverTimestamp(),
        donorCount: 0,
      };

      const docRef = await addDoc(collection(db, 'projects'), projectData);
      navigate(`/projects/${docRef.id}`);
    } catch (err) {
      console.error('Error creating project', err);
      setError('حدث خطأ أثناء إنشاء المشروع. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">يجب تسجيل الدخول لإنشاء مشروع</h2>
        <button onClick={() => navigate('/')} className="bg-sudan-green text-white px-6 py-2 rounded-full">العودة للرئيسية</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col section-gap">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">أنشئ مشروعك الخيري</h1>
        <p className="text-slate-600 text-lg">املأ البيانات التالية لبدء حملة التبرعات الخاصة بك.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8 bg-white p-10 rounded-3xl card-shadow border border-slate-100">
        {error && (
          <div className="bg-red-50 text-red-600 p-5 rounded-2xl flex items-center gap-4 border border-red-100">
            <AlertCircle size={24} />
            <span className="font-bold">{error}</span>
          </div>
        )}

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-slate-700">اسم المشروع</label>
            <input
              required
              type="text"
              placeholder="مثال: حفر بئر في قرية..."
              className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-sudan-green focus:bg-white transition-all outline-none font-semibold"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-slate-700">تصنيف المشروع</label>
            <select
              className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-sudan-green focus:bg-white transition-all outline-none font-bold appearance-none"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ProjectCategory })}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-slate-700">وصف المشروع</label>
            <textarea
              required
              rows={5}
              placeholder="اشرح تفاصيل المشروع وأثره المتوقع..."
              className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-sudan-green focus:bg-white transition-all outline-none font-semibold leading-relaxed"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-slate-700">المبلغ المستهدف (ج.س)</label>
              <input
                required
                type="number"
                placeholder="0"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-sudan-green focus:bg-white transition-all outline-none font-bold"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-slate-700">رابط صورة المشروع (اختياري)</label>
              <input
                type="url"
                placeholder="https://..."
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-sudan-green focus:bg-white transition-all outline-none font-semibold"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="text-sm font-bold text-slate-700">خصوصية المشروع</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPublic: true })}
                className={`flex items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                  formData.isPublic ? 'border-sudan-green bg-sudan-green/5 text-sudan-green' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.isPublic ? 'bg-sudan-green text-white' : 'bg-slate-100'}`}>
                  <Globe size={24} />
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">عام</div>
                  <div className="text-xs font-semibold opacity-70">يظهر للجميع في المنصة</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isPublic: false })}
                className={`flex items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
                  !formData.isPublic ? 'border-sudan-green bg-sudan-green/5 text-sudan-green' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${!formData.isPublic ? 'bg-sudan-green text-white' : 'bg-slate-100'}`}>
                  <Lock size={24} />
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">خاص</div>
                  <div className="text-xs font-semibold opacity-70">عبر الرابط المباشر فقط</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl flex items-start gap-4 border border-slate-100">
          <Info className="text-sudan-gold flex-shrink-0 mt-1" size={24} />
          <p className="text-sm text-slate-600 leading-relaxed font-semibold">
            بإنشائك لهذا المشروع، أنت تلتزم بصحة البيانات المقدمة. سيتم مراجعة المشروع من قبل المشرفين قبل تفعيله للعامة لضمان الأمان والشفافية.
          </p>
        </div>

        <button
          disabled={loading}
          type="submit"
          className="w-full py-5 bg-sudan-green text-white rounded-2xl font-bold text-xl hover:bg-sudan-green-dark transition-all shadow-xl shadow-sudan-green/20 disabled:opacity-50 disabled:shadow-none active:scale-[0.98]"
        >
          {loading ? 'جاري إنشاء المشروع...' : 'ابدأ مشروع الخير الآن'}
        </button>
      </form>
    </div>
  );
};

export default CreateProject;
