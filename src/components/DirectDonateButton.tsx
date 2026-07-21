import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Copy, Check, Upload, X, AlertCircle } from 'lucide-react';
import { apiRequest, siteApi, SiteBankAccount } from '../lib/api';

const DirectDonateButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bank, setBank] = useState<SiteBankAccount | null>(null);

  const [formData, setFormData] = useState({
    type: 'تبرع عام',
    amount: '',
    donorName: 'فاعل خير',
  });
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    siteApi
      .settings()
      .then((s) => {
        const primary =
          s.bankAccounts?.find((b) => b.isPrimary) || s.bankAccounts?.[0] || null;
        setBank(primary);
      })
      .catch(() => {
        // fallback shown in UI
      });
  }, []);

  const accountNumber = bank?.accountNumber || '1780926';
  const bankName = bank?.bankName || 'بنك الخرطوم';
  const accountName = bank?.accountName || 'منصة الجسد الواحد';
  const instructions = bank?.instructions || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setReceiptBase64(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptBase64) {
      setError('يرجى تحميل صورة إشعار التحويل البنكي.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiRequest('/direct-donations/', {
        method: 'POST',
        body: JSON.stringify({
          donationType: formData.type,
          amount: Number(formData.amount),
          donorName: formData.donorName || 'فاعل خير',
          receiptImage: receiptBase64,
        }),
      });

      setSuccess(true);
      setFormData({ type: 'تبرع عام', amount: '', donorName: 'فاعل خير' });
      setReceiptBase64(null);
      setFileName(null);
    } catch (err) {
      console.error('Error submitting direct donation', err);
      setError('حدث خطأ أثناء إرسال البيانات. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed top-24 left-6 z-[90]">
        <motion.button
          onClick={() => {
            setIsOpen(true);
            setSuccess(false);
            setError(null);
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-sudan-red text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold hover:bg-opacity-95 transition-all text-sm md:text-base border border-white/20"
        >
          <Heart size={18} fill="currentColor" />
          <span>تبرع الآن</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Heart className="text-sudan-red" size={24} fill="currentColor" />
                  <span>التبرع المباشر للحساب</span>
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-grow no-scrollbar">
                {success ? (
                  <div className="text-center py-8 space-y-4">
                    <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
                      ✓
                    </div>
                    <h4 className="text-xl font-bold text-slate-900">تم إرسال إشعار التبرع بنجاح!</h4>
                    <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                      شكراً لجودك وعطائك. سيتم مراجعة إشعار التحويل من قبل المشرفين لتأكيد المعاملة.
                    </p>
                    <button onClick={() => setIsOpen(false)} className="btn-primary mt-6 px-8 py-3">
                      إغلاق
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                      <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold border border-red-100">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl space-y-4 shadow-md relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                      <div className="text-xs font-bold tracking-wider text-slate-400 uppercase">
                        بيانات الحساب البنكي (من لوحة Django)
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-sm font-semibold text-slate-300">{bankName}</div>
                        <div className="text-lg font-bold text-white">{accountName}</div>
                        <div className="flex items-center justify-between bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 mt-3">
                          <span className="font-mono text-xl font-bold tracking-wider">
                            {accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs bg-white text-slate-900 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-100 transition-colors shadow-sm"
                          >
                            {copied ? (
                              <>
                                <Check size={14} className="text-green-600" />
                                <span>تم النسخ</span>
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                <span>نسخ الرقم</span>
                              </>
                            )}
                          </button>
                        </div>
                        {instructions && (
                          <p className="text-xs text-slate-300 mt-2 leading-relaxed">{instructions}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        نوع التبرع
                      </label>
                      <select
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-sudan-green focus:bg-white outline-none font-bold text-sm"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      >
                        <option value="تبرع عام">تبرع عام</option>
                        <option value="سقيا ماء / آبار">سقيا ماء / آبار</option>
                        <option value="بناء مساجد">بناء مساجد</option>
                        <option value="كفالة تعليم">كفالة تعليم</option>
                        <option value="دعم صحي">دعم صحي</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        المبلغ المتبرع به (ج.س)
                      </label>
                      <input
                        required
                        type="number"
                        placeholder="أدخل المبلغ بالجنيه السوداني"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-sudan-green focus:bg-white outline-none font-bold text-sm"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        اسم المتبرع (اختياري)
                      </label>
                      <input
                        type="text"
                        placeholder="فاعل خير"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:border-sudan-green focus:bg-white outline-none font-semibold text-sm"
                        value={formData.donorName}
                        onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        صورة إشعار التحويل
                      </label>
                      <div className="relative border-2 border-dashed border-slate-200 hover:border-sudan-green rounded-2xl p-6 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50">
                        <input
                          type="file"
                          accept="image/*"
                          required
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleFileChange}
                        />
                        <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-slate-400">
                          <Upload size={20} />
                        </div>
                        <div className="text-xs font-bold text-slate-700">
                          {fileName ? fileName : 'اضغط لتحميل أو سحب صورة الإشعار'}
                        </div>
                        <div className="text-[10px] text-slate-400">يدعم ملفات الصور (PNG, JPG)</div>
                      </div>
                      {receiptBase64 && (
                        <div className="mt-2 relative w-24 h-24 border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-slate-100">
                          <img
                            src={receiptBase64}
                            alt="Receipt preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 bg-sudan-green text-white rounded-xl font-bold text-base hover:bg-sudan-green-dark transition-all disabled:opacity-50 disabled:shadow-none active:scale-[0.98] mt-4 shadow-lg shadow-sudan-green/10"
                    >
                      {loading ? 'جاري إرسال الإشعار...' : 'إرسال إشعار التبرع'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DirectDonateButton;
