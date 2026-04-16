import React, { useState } from 'react';
import { db, serverTimestamp } from '../firebase';
import { doc, updateDoc, increment, addDoc, collection } from 'firebase/firestore';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, ShieldCheck, CreditCard } from 'lucide-react';

interface DonationModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

const DonationModal: React.FC<DonationModalProps> = ({ project, onClose, onSuccess }) => {
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleDonate = async () => {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);

    try {
      const donationAmount = Number(amount);
      
      // 1. Create donation record
      await addDoc(collection(db, 'donations'), {
        projectId: project.id,
        projectTitle: project.title,
        amount: donationAmount,
        donorId: isAnonymous ? null : user?.uid || null,
        donorName: isAnonymous ? 'متبرع فاعل خير' : profile?.displayName || 'متبرع',
        isAnonymous,
        createdAt: serverTimestamp(),
        status: 'success'
      });

      // 2. Update project stats
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, {
        currentAmount: increment(donationAmount),
        donorCount: increment(1)
      });

      setStep(3);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Donation failed', error);
      alert('حدث خطأ أثناء إتمام التبرع. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 flex justify-between items-center border-b border-slate-100">
          <h3 className="text-xl font-bold text-slate-900">تبرع للمشروع</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 text-center">اختر مبلغ التبرع (ج.س)</label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[1000, 5000, 10000].map(val => (
                    <button
                      key={val}
                      onClick={() => setAmount(val.toString())}
                      className={`py-3 rounded-xl border-2 font-bold transition-all ${
                        amount === val.toString() ? 'border-sudan-green bg-sudan-green/5 text-sudan-green' : 'border-slate-100 text-slate-600 hover:border-slate-200'
                      }`}
                    >
                      {val.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="مبلغ آخر..."
                  className="w-full px-4 py-4 bg-slate-50 border-none rounded-2xl text-center text-xl font-bold focus:ring-2 focus:ring-sudan-green"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                <input
                  type="checkbox"
                  id="anonymous"
                  className="w-5 h-5 rounded border-slate-300 text-sudan-green focus:ring-sudan-green"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                />
                <label htmlFor="anonymous" className="text-sm text-slate-600 font-medium cursor-pointer">تبرع كفاعل خير (إخفاء الاسم)</label>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!amount || Number(amount) <= 0}
                className="w-full py-4 bg-sudan-green text-white rounded-2xl font-bold text-lg hover:bg-opacity-90 transition-all shadow-lg disabled:opacity-50"
              >
                المتابعة للدفع
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="text-slate-500 text-sm mb-1">إجمالي التبرع</div>
                <div className="text-3xl font-bold text-slate-900">{Number(amount).toLocaleString()} ج.س</div>
              </div>

              <div className="space-y-4">
                <div className="p-4 border-2 border-slate-100 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-sudan-green transition-all">
                  <CreditCard className="text-sudan-green" />
                  <div className="text-right">
                    <div className="font-bold">بطاقة مصرفية</div>
                    <div className="text-xs text-slate-500">فيزا، ماستركارد، بنكك</div>
                  </div>
                </div>
                <div className="p-4 border-2 border-slate-100 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-sudan-green transition-all">
                  <div className="w-6 h-6 bg-sudan-gold rounded-full flex items-center justify-center text-white text-[10px] font-bold">S</div>
                  <div className="text-right">
                    <div className="font-bold">سوداني كاش / زين كاش</div>
                    <div className="text-xs text-slate-500">عبر رقم الهاتف</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
                <ShieldCheck size={14} />
                <span>دفع آمن ومشفر 100%</span>
              </div>

              <button
                onClick={handleDonate}
                disabled={loading}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? 'جاري المعالجة...' : 'تأكيد التبرع الآن'}
              </button>
              <button onClick={() => setStep(1)} className="w-full text-slate-500 text-sm font-medium">العودة لتعديل المبلغ</button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-sudan-green text-white rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Heart size={40} fill="currentColor" />
              </motion.div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">تقبل الله منك!</h3>
              <p className="text-slate-600">تم استلام تبرعك بنجاح. شكراً لمساهمتك في صنع الفرق.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DonationModal;
