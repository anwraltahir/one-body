import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../lib/api';
import { motion } from 'motion/react';
import { Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import logo from '../assets/logo.png';

const Login: React.FC = () => {
  const {
    user,
    login,
    register,
    startGoogleLogin,
    loading: authLoading,
    consumeGoogleOAuthError,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    const oauthErr = consumeGoogleOAuthError();
    if (oauthErr) {
      setError(
        oauthErr.includes('access_denied')
          ? 'تم إلغاء تسجيل الدخول عبر Google.'
          : oauthErr.startsWith('فشل') || oauthErr.includes('Google')
            ? oauthErr
            : `فشل تسجيل الدخول عبر Google: ${oauthErr}`,
      );
    }
  }, [consumeGoogleOAuthError]);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, from]);

  useEffect(() => {
    let cancelled = false;
    authApi
      .googleConfig()
      .then((config) => {
        if (!cancelled) setGoogleEnabled(Boolean(config.googleEnabled && config.googleClientId));
      })
      .catch(() => {
        if (!cancelled) setGoogleEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGoogleClick = async () => {
    setError(null);
    setLoading(true);
    try {
      await startGoogleLogin(from);
      // Browser navigates away; loading stays until then
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل بدء تسجيل الدخول عبر Google');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        if (password.length < 8) {
          throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
        }
        await register(email, password, displayName || undefined);
      }
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : mode === 'login'
            ? 'فشل تسجيل الدخول. تحقق من البيانات.'
            : 'فشل إنشاء الحساب.';
      if (msg.includes('No active account') || msg.includes('credentials')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else if (msg.includes('already exists') || msg.includes('unique')) {
        setError('هذا البريد مسجّل مسبقاً. جرّب تسجيل الدخول.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl card-shadow border border-slate-100 p-8 md:p-10"
      >
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="الجسد الواحد" className="w-16 h-16 object-contain mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-slate-500 text-sm mt-2 text-center">
            منصة الجسد الواحد — معاً لنصنع أثراً
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl flex items-start gap-3 border border-red-100 text-sm">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="الاسم"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-sudan-green focus:bg-white outline-none font-semibold"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              required
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-sudan-green focus:bg-white outline-none font-semibold"
            />
          </div>

          <div className="relative">
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              required
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:border-sudan-green focus:bg-white outline-none font-semibold"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-sudan-green text-white rounded-2xl font-bold text-lg hover:bg-opacity-90 transition-all shadow-lg shadow-sudan-green/20 disabled:opacity-50 mt-2"
          >
            {loading ? 'جاري المعالجة...' : mode === 'login' ? 'دخول' : 'إنشاء الحساب'}
          </button>
        </form>

        {googleEnabled && (
          <>
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-bold">أو</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={loading}
              className="w-full py-3.5 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              المتابعة باستخدام Google
            </button>
          </>
        )}

        <div className="mt-8 text-center text-sm">
          {mode === 'login' ? (
            <p className="text-slate-500">
              ليس لديك حساب؟{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="text-sudan-green font-bold hover:underline"
              >
                سجّل الآن
              </button>
            </p>
          ) : (
            <p className="text-slate-500">
              لديك حساب؟{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-sudan-green font-bold hover:underline"
              >
                سجّل الدخول
              </button>
            </p>
          )}
        </div>

        <Link
          to="/"
          className="mt-6 flex items-center justify-center gap-2 text-slate-400 text-sm hover:text-sudan-green transition-colors"
        >
          <ArrowRight size={16} />
          العودة للرئيسية
        </Link>
      </motion.div>
    </div>
  );
};

export default Login;
