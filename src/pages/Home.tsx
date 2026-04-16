import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';
import { Project } from '../types';
import ProjectCard from '../components/ProjectCard';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowLeft, Droplets, Landmark, GraduationCap, HeartPulse, Coins, Sparkles } from 'lucide-react';

const categories = [
  { name: 'مياه وآبار', icon: Droplets, color: 'text-blue-500' },
  { name: 'مساجد', icon: Landmark, color: 'text-emerald-600' },
  { name: 'دعم التعليم', icon: GraduationCap, color: 'text-purple-500' },
  { name: 'الصحة', icon: HeartPulse, color: 'text-red-500' },
  { name: 'زكاة مال', icon: Coins, color: 'text-amber-500' },
];

const Home: React.FC = () => {
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const q = query(
          collection(db, 'projects'),
          where('isPublic', '==', true),
          where('status', '==', 'active'),
          limit(3)
        );
        const snapshot = await getDocs(q);
        const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setFeaturedProjects(projects);
      } catch (error) {
        console.error('Error fetching projects', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col section-gap">
      {/* Hero Section */}
      <section className="relative h-[400px] rounded-3xl overflow-hidden bg-slate-900 flex items-center px-10">
        <motion.div 
          style={{ y: y1 }}
          className="absolute inset-0 opacity-30 pointer-events-none"
        >
          <img 
            src="https://picsum.photos/seed/sudan-charity/1200/600" 
            alt="" 
            className="w-full h-full object-cover scale-110"
            referrerPolicy="no-referrer"
          />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-l from-slate-900/80 via-slate-900/40 to-transparent"></div>
        
        <div className="relative z-10 max-w-2xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight"
          >
            كالبنيان يشد بعضه بعضاً
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-200 mb-8 leading-relaxed"
          >
            منصة سودانية ذكية لتمكين المشاريع الخيرية وتتبع أثرها بكل شفافية وأمان.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-4"
          >
            <Link to="/projects" className="btn-primary text-lg px-8 py-3">استكشف المشاريع</Link>
            <Link to="/create-project" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all">أنشئ مشروعاً</Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl card-shadow border-r-4 border-sudan-gold">
          <div className="text-3xl font-bold text-sudan-green">1,420,000</div>
          <div className="text-sm text-slate-500 font-semibold mt-1">إجمالي التبرعات (ج.س)</div>
        </div>
        <div className="bg-white p-6 rounded-2xl card-shadow border-r-4 border-sudan-red">
          <div className="text-3xl font-bold text-sudan-green">128</div>
          <div className="text-sm text-slate-500 font-semibold mt-1">مشروع نشط حالياً</div>
        </div>
        <div className="bg-white p-6 rounded-2xl card-shadow border-r-4 border-sudan-green">
          <div className="text-3xl font-bold text-sudan-green">10,000+</div>
          <div className="text-sm text-slate-500 font-semibold mt-1">حياة تم تغييرها</div>
        </div>
      </section>

      {/* Categories */}
      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-slate-900">تصنيفات الخير</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <div key={cat.name} className="bg-white p-6 rounded-2xl card-shadow flex flex-col items-center gap-4 hover:border-sudan-green border-2 border-transparent transition-all cursor-pointer group">
              <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center text-2xl group-hover:bg-sudan-green/10 transition-colors">
                {cat.name === 'مياه وآبار' && '💧'}
                {cat.name === 'مساجد' && '🕌'}
                {cat.name === 'دعم التعليم' && '🎓'}
                {cat.name === 'الصحة' && '⚕️'}
                {cat.name === 'زكاة مال' && '🌾'}
              </div>
              <span className="font-bold text-slate-700">{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Projects */}
      <section className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">مشاريع مميزة</h2>
          <Link to="/projects" className="text-sudan-green font-bold hover:underline">عرض الكل ←</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-[400px] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

export default Home;
