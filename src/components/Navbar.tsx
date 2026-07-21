import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { User, LogOut, Menu, X, Globe, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import logo from '../assets/logo.png';

const Navbar: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const { t, toggleLang, isAr } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();

  const isAdmin =
    user &&
    (user.isSuperuser || user.isStaff || user.role === 'admin' || profile?.role === 'admin');

  return (
    <nav className="bg-white header-shadow sticky top-0 z-50 h-[70px] flex items-center">
      <div className="max-w-7xl mx-auto px-6 w-full h-full">
        <div className="flex justify-between items-center h-full">
          <div className="flex-1 flex justify-start items-center">
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <img src={logo} alt={t('siteName')} className="w-10 h-10 object-contain shrink-0" />
              <span className="text-xl lg:text-2xl font-bold text-sudan-green tracking-tight whitespace-nowrap">
                {t('siteName')}
              </span>
            </Link>
          </div>

          <div className="hidden md:flex flex-1 justify-center items-center">
            <div className="flex items-center gap-8 font-semibold text-[15px]">
              <Link to="/" className="text-sudan-green hover:opacity-80 transition-opacity whitespace-nowrap">
                {t('home')}
              </Link>
              <Link
                to="/projects"
                className="text-slate-600 hover:text-sudan-green transition-colors whitespace-nowrap"
              >
                {t('projects')}
              </Link>
              <Link
                to="/about"
                className="text-slate-600 hover:text-sudan-green transition-colors whitespace-nowrap"
              >
                {t('about')}
              </Link>
            </div>
          </div>

          <div className="hidden md:flex flex-1 justify-end items-center gap-6">
            <button
              type="button"
              onClick={toggleLang}
              className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-500 hover:text-sudan-green transition-colors"
              title={t('langSwitch')}
            >
              <span>{t('langSwitch')}</span>
              <Globe size={18} />
            </button>

            {user ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/create-project')}
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  {t('startProject')}
                </button>
                <div className="relative group">
                  <button className="flex items-center justify-center w-9 h-9 rounded-full border-2 border-slate-200 hover:bg-slate-50 transition-colors bg-slate-100 text-slate-600 overflow-hidden">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={18} />
                    )}
                  </button>
                  <div
                    className={`absolute ${isAr ? 'left-0' : 'right-0'} mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all`}
                  >
                    <div className="px-4 py-2 text-xs text-slate-400 truncate border-b border-slate-50 mb-1">
                      {profile?.displayName || user.email}
                    </div>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-sudan-green hover:bg-emerald-50 font-bold"
                      >
                        <Shield size={18} />
                        <span>{t('adminPanel')}</span>
                      </Link>
                    )}
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <User size={18} className="text-slate-400" />
                      <span>{t('dashboard')}</span>
                    </Link>
                    <div className="h-px bg-slate-100 my-1 mx-2"></div>
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={18} />
                      <span>{t('logout')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <button
                  onClick={() => navigate('/login')}
                  className="text-slate-600 font-bold text-sm hover:text-sudan-green transition-colors whitespace-nowrap"
                >
                  {t('login')}
                </button>
                <button
                  onClick={() => navigate('/create-project')}
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  {t('startProject')}
                </button>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLang}
              className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              <Globe size={20} />
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden absolute top-[70px] left-0 right-0 bg-white border-b border-slate-100 overflow-hidden z-40 shadow-lg"
          >
            <div className="px-6 py-8 space-y-6">
              <Link
                to="/"
                className="block text-lg font-bold text-sudan-green"
                onClick={() => setIsOpen(false)}
              >
                {t('home')}
              </Link>
              <Link
                to="/projects"
                className="block text-lg font-bold text-slate-600"
                onClick={() => setIsOpen(false)}
              >
                {t('projects')}
              </Link>
              <Link
                to="/about"
                className="block text-lg font-bold text-slate-600"
                onClick={() => setIsOpen(false)}
              >
                {t('about')}
              </Link>
              <div className="h-px bg-slate-100 my-4"></div>
              <div className="flex flex-col gap-4">
                {user ? (
                  <>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="block text-lg font-bold text-sudan-green"
                        onClick={() => setIsOpen(false)}
                      >
                        {t('adminPanel')}
                      </Link>
                    )}
                    <Link
                      to="/dashboard"
                      className="block text-lg font-bold text-slate-600"
                      onClick={() => setIsOpen(false)}
                    >
                      {t('dashboard')}
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
                      className="block text-lg font-bold text-red-600 text-start"
                    >
                      {t('logout')}
                    </button>
                    <button
                      onClick={() => {
                        navigate('/create-project');
                        setIsOpen(false);
                      }}
                      className="btn-primary w-full"
                    >
                      {t('startProject')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        navigate('/login');
                        setIsOpen(false);
                      }}
                      className="text-lg font-bold text-slate-600 text-start"
                    >
                      {t('login')}
                    </button>
                    <button
                      onClick={() => {
                        navigate('/create-project');
                        setIsOpen(false);
                      }}
                      className="btn-primary w-full"
                    >
                      {t('startProject')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
