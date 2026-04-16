import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart, User, LogOut, Menu, X, PlusCircle, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Navbar: React.FC = () => {
  const { user, login, logout } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();

  return (
    <nav className="bg-white header-shadow sticky top-0 z-50 h-[70px] flex items-center">
      <div className="max-w-7xl mx-auto px-6 w-full h-full">
        <div className="flex justify-between items-center h-full">
          
          {/* Right Side: Logo */}
          <div className="flex-1 flex justify-start items-center">
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-sudan-green rounded-lg relative flex items-center justify-center shrink-0 shadow-sm">
                <div className="absolute w-5 h-1 bg-sudan-red top-[18px] left-[10px]"></div>
              </div>
              <span className="text-xl lg:text-2xl font-bold text-sudan-green tracking-tight whitespace-nowrap">الجسد الواحد</span>
            </Link>
          </div>

          {/* Center: Navigation Links */}
          <div className="hidden md:flex flex-1 justify-center items-center">
            <div className="flex items-center gap-8 font-semibold text-[15px]">
              <Link to="/" className="text-sudan-green hover:opacity-80 transition-opacity whitespace-nowrap">الرئيسية</Link>
              <Link to="/projects" className="text-slate-600 hover:text-sudan-green transition-colors whitespace-nowrap">المشاريع</Link>
              <Link to="/about" className="text-slate-600 hover:text-sudan-green transition-colors whitespace-nowrap">عن المنصة</Link>
            </div>
          </div>

          {/* Left Side: Actions */}
          <div className="hidden md:flex flex-1 justify-end items-center gap-6">
            <div className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-500 hover:text-sudan-green transition-colors">
              <span>English</span>
              <Globe size={18} />
            </div>

            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/create-project')}
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  ابدأ مشروعك
                </button>
                <div className="relative group">
                  <button className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-colors">
                    <img src={user.photoURL || ''} alt="" className="w-9 h-9 rounded-full border-2 border-slate-100" referrerPolicy="no-referrer" />
                  </button>
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                      <User size={18} className="text-slate-400" />
                      <span>لوحة التحكم</span>
                    </Link>
                    <div className="h-px bg-slate-100 my-1 mx-2"></div>
                    <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                      <LogOut size={18} />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <button 
                  onClick={login} 
                  className="text-slate-600 font-bold text-sm hover:text-sudan-green transition-colors whitespace-nowrap"
                >
                  دخول
                </button>
                <button 
                  onClick={() => navigate('/create-project')}
                  className="btn-primary text-sm whitespace-nowrap"
                >
                  ابدأ مشروعك
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden absolute top-[70px] left-0 right-0 bg-white border-b border-slate-100 overflow-hidden z-40 shadow-lg"
          >
            <div className="px-6 py-8 space-y-6">
              <Link to="/" className="block text-lg font-bold text-sudan-green" onClick={() => setIsOpen(false)}>الرئيسية</Link>
              <Link to="/projects" className="block text-lg font-bold text-slate-600" onClick={() => setIsOpen(false)}>المشاريع</Link>
              <Link to="/about" className="block text-lg font-bold text-slate-600" onClick={() => setIsOpen(false)}>عن المنصة</Link>
              <div className="h-px bg-slate-100 my-4"></div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <Globe size={20} />
                  <span>English</span>
                </div>
                {user ? (
                  <>
                    <Link to="/dashboard" className="block text-lg font-bold text-slate-600" onClick={() => setIsOpen(false)}>لوحة التحكم</Link>
                    <button onClick={() => { logout(); setIsOpen(false); }} className="block text-lg font-bold text-red-600 text-right">تسجيل الخروج</button>
                    <button onClick={() => { navigate('/create-project'); setIsOpen(false); }} className="btn-primary w-full">ابدأ مشروعك</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { login(); setIsOpen(false); }} className="text-lg font-bold text-slate-600 text-right">تسجيل الدخول</button>
                    <button onClick={() => { navigate('/create-project'); setIsOpen(false); }} className="btn-primary w-full">ابدأ مشروعك</button>
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
