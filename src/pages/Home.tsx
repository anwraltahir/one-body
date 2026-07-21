import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { projectsApi, siteApi, SiteSettings } from '../lib/api';
import { Project } from '../types';
import ProjectCard from '../components/ProjectCard';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowLeft, Droplets, Landmark, GraduationCap, HeartPulse, Coins } from 'lucide-react';

const categories = [
  { name: 'مياه وآبار', icon: Droplets, color: 'text-blue-500' },
  { name: 'مساجد', icon: Landmark, color: 'text-emerald-600' },
  { name: 'دعم التعليم', icon: GraduationCap, color: 'text-purple-500' },
  { name: 'الصحة', icon: HeartPulse, color: 'text-red-500' },
  { name: 'زكاة مال', icon: Coins, color: 'text-amber-500' },
];

const Home: React.FC = () => {
  const [featuredProjects, setFeaturedProjects] = useState<Project[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projects, site] = await Promise.all([
          projectsApi.list({ status: 'active' }),
          siteApi.settings().catch(() => null),
        ]);
        setFeaturedProjects(projects.slice(0, 3) as Project[]);
        if (site) setSettings(site);
      } catch (error) {
        console.error('Error fetching projects', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col section-gap">
      {/* Hero Section */}
      <section className="relative h-[400px] rounded-3xl overflow-hidden bg-slate-900 flex items-center px-10">
        <motion.div
          style={{ y: y1 }}
          className="absolute inset-0 opacity-10 pointer-events-none"
        >
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-l from-slate-900/80 via-slate-900/40 to-transparent"></div>

        <div className="relative z-10 max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight"
          >
            {settings?.heroTitle || 'كالبنيان يشد بعضه بعضاً'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-200 mb-8 leading-relaxed"
          >
            {settings?.heroSubtitle ||
              'منصة سودانية ذكية لتمكين المشاريع الخيرية وتتبع أثرها بكل شفافية وأمان.'}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-4"
          >
            <Link to="/projects" className="btn-primary">
              استكشف المشاريع
            </Link>
            <Link
              to="/create-project"
              className="px-6 py-3 bg-white/10 text-white rounded-full font-bold hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              ابدأ مشروعك
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-900">مجالات الخير</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={`/projects?category=${encodeURIComponent(cat.name)}`}
              className="bg-white p-6 rounded-2xl border border-slate-100 card-shadow flex flex-col items-center gap-3 hover:border-sudan-green/30 transition-all"
            >
              <cat.icon className={cat.color} size={32} />
              <span className="font-bold text-slate-700 text-sm text-center">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-slate-900">مشاريع مميزة</h2>
          <Link
            to="/projects"
            className="flex items-center gap-2 text-sudan-green font-bold hover:opacity-80"
          >
            <span>عرض الكل</span>
            <ArrowLeft size={18} />
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-16 text-slate-400 font-bold">جاري التحميل...</div>
        ) : featuredProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 font-bold bg-white rounded-3xl border border-slate-100">
            لا توجد مشاريع نشطة حالياً
          </div>
        )}
      </section>
    </main>
  );
};

export default Home;
