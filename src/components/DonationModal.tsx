import React, { useEffect, useState } from 'react';
import { donationsApi, siteApi, SiteBankAccount } from '../lib/api';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'motion/react';
import { X, Heart, ShieldCheck, Copy, Check, Upload, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DonationModalProps {
  project: Project;
  onClose: () => void;
  onSuccess: () => void;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 900;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX) {
            height *= MAX / width;
            width = MAX;
          }
        } else if (height > MAX) {
          width *= MAX / height;
          height = MAX;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject;
      img.src = event.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const DonationModal: React.FC<DonationModalProps> = ({ project, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { t, isAr } = useLanguage();
  const [amount, setAmount] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [banks, setBanks] = useState<SiteBankAccount[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [donorPhone, setDonorPhone] = useState('');

  const presets = [1000, 5000, 10000, 25000, 50000, 100000];

  useEffect(() => {
    siteApi
      .settings()
      .then((s) => {
        const list = s.bankAccounts || [];
        setBanks(list);
        const primary = list.find((b) => b.isPrimary) || list[0];
        if (primary) setSelectedBankId(primary.id);
      })
      .catch(() => undefined);
  }, []);

  const selectedBank = banks.find((b) => b.id === selectedBankId) || banks[0] || null;

  const handleCopy = async () => {
    if (!selectedBank) return;
    try {
      await navigator.clipboard.writeText(selectedBank.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const data = await compressImage(file);
      setReceiptBase64(data);
    } catch {
      setError(isAr ? 'فشل قراءة الصورة' : 'Failed to read image');
    }
  };

  const handleDonate = async () => {
    if (!amount || Number(amount) <= 0) return;
    if (!receiptBase64) {
      setError(isAr ? 'يرجى رفع صورة إشعار التحويل' : 'Please upload transfer receipt');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await donationsApi.create({
        projectId: project.id,
        amount: Number(amount),
        isAnonymous,
        receiptImage: receiptBase64,
        bankAccountId: selectedBank?.id,
        donorPhone: donorPhone || undefined,
      });
      setStep(3);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? 'حدث خطأ أثناء إرسال التبرع.'
            : 'Failed to submit donation.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
      >
        <div className="p-6 flex justify-between items-center border-b border-slate-100 shrink-0">
          <h3 className="text-xl font-bold text-slate-900">{t('donateToProject')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6">
              <p className="text-center text-sm text-slate-500 font-semibold">{project.title}</p>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 text-center">
                  {t('chooseAmount')}
                </label>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAmount(String(p))}
                      className={`py-3 rounded-xl font-bold text-sm transition-all ${
                        amount === String(p)
                          ? 'bg-sudan-green text-white shadow-md'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder={t('orEnterAmount')}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-sudan-green text-center"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-5 h-5 accent-sudan-green"
                />
                <span className="text-sm font-semibold text-slate-600">{t('anonymous')}</span>
              </label>

              <input
                type="tel"
                placeholder={isAr ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'}
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-sudan-green text-sm"
              />

              {!user && (
                <p className="text-xs text-slate-500 text-center">
                  {isAr ? (
                    <>
                      يمكنك التبرع كزائر، أو{' '}
                      <Link to="/login" className="text-sudan-green font-bold">
                        سجّل دخولك
                      </Link>{' '}
                      لتتبع تبرعاتك.
                    </>
                  ) : (
                    <>
                      Guest donation allowed, or{' '}
                      <Link to="/login" className="text-sudan-green font-bold">
                        sign in
                      </Link>{' '}
                      to track donations.
                    </>
                  )}
                </p>
              )}

              {error && <p className="text-sm text-red-600 font-semibold text-center">{error}</p>}

              <button
                disabled={!amount || Number(amount) <= 0}
                onClick={() => {
                  setError(null);
                  setStep(2);
                }}
                className="w-full py-4 bg-sudan-green text-white rounded-2xl font-bold disabled:opacity-50"
              >
                {t('continue')}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-slate-500 text-sm font-semibold mb-1">
                  {isAr ? 'مبلغ التبرع' : 'Donation amount'}
                </p>
                <p className="text-3xl font-bold text-slate-900">
                  {Number(amount).toLocaleString()} {isAr ? 'ج.س' : 'SDG'}
                </p>
              </div>

              {/* Professional bank card from admin */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl space-y-3 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-400 uppercase">
                  <Building2 size={14} />
                  {t('bankDetails')}
                </div>

                {banks.length > 1 && (
                  <select
                    value={selectedBankId ?? ''}
                    onChange={(e) => setSelectedBankId(Number(e.target.value))}
                    className="w-full bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.id} className="text-slate-900">
                        {b.bankName} — {b.accountNumber}
                      </option>
                    ))}
                  </select>
                )}

                {selectedBank ? (
                  <div className="space-y-2">
                    <div className="text-sm text-slate-300">{selectedBank.bankName}</div>
                    <div className="text-lg font-bold">
                      {selectedBank.accountName || (isAr ? 'منصة الجسد الواحد' : 'Aljasad Alwahid')}
                    </div>
                    <div className="flex items-center justify-between bg-white/10 px-4 py-2.5 rounded-xl border border-white/10">
                      <span className="font-mono text-xl font-bold tracking-wider" dir="ltr">
                        {selectedBank.accountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 text-xs bg-white text-slate-900 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-100"
                      >
                        {copied ? (
                          <>
                            <Check size={14} className="text-green-600" />
                            {t('copied')}
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            {t('copyNumber')}
                          </>
                        )}
                      </button>
                    </div>
                    {selectedBank.iban && (
                      <div className="text-xs text-slate-400 font-mono" dir="ltr">
                        IBAN: {selectedBank.iban}
                      </div>
                    )}
                    {selectedBank.instructions && (
                      <p className="text-xs text-slate-300 leading-relaxed">{selectedBank.instructions}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-amber-200">
                    {isAr
                      ? 'لم تُضف حسابات بنكية بعد. تواصل مع الإدارة.'
                      : 'No bank accounts configured yet. Contact admin.'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {t('uploadReceipt')}
                </label>
                <div className="relative border-2 border-dashed border-slate-200 hover:border-sudan-green rounded-2xl p-5 flex flex-col items-center gap-2 cursor-pointer bg-slate-50">
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFile}
                  />
                  <Upload size={22} className="text-slate-400" />
                  <div className="text-xs font-bold text-slate-700">
                    {fileName || t('uploadHint')}
                  </div>
                </div>
                {receiptBase64 && (
                  <img
                    src={receiptBase64}
                    alt="Receipt"
                    className="mt-2 w-24 h-24 object-cover rounded-xl border border-slate-100"
                  />
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={16} className="text-sudan-gold" />
                <span>
                  {isAr
                    ? 'لن يُضاف المبلغ للمشروع إلا بعد تحقق الإدارة من الإشعار'
                    : 'Amount is added only after admin verifies the receipt'}
                </span>
              </div>

              {error && <p className="text-sm text-red-600 font-semibold text-center">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold"
                >
                  {t('back')}
                </button>
                <button
                  disabled={loading || !receiptBase64}
                  onClick={handleDonate}
                  className="flex-1 py-3 bg-sudan-green text-white rounded-2xl font-bold disabled:opacity-50"
                >
                  {loading ? t('submitting') : t('submitDonation')}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-4 py-6">
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <Heart size={36} fill="currentColor" />
              </div>
              <h4 className="text-2xl font-bold text-slate-900">{t('donationPendingTitle')}</h4>
              <p className="text-slate-500 text-sm leading-relaxed px-2">{t('donationPendingMsg')}</p>
              <span className="inline-block px-4 py-1.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                {t('statusPending')}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DonationModal;
