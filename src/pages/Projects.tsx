import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Project, ProjectCategory } from '../types';
import ProjectCard from '../components/ProjectCard';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';

const categories: ProjectCategory[] = ['مياه وآبار', 'مساجد', 'زكاة مال', 'زكاة فطر', 'فدية صيام', 'دعم التعليم', 'الصحة'];

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'الكل'>('الكل');

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        let q = query(
          collection(db, 'projects'),
          where('isPublic', '==', true),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc')
        );

        if (selectedCategory !== 'الكل') {
          q = query(
            collection(db, 'projects'),
            where('isPublic', '==', true),
            where('status', '==', 'active'),
            where('category', '==', selectedCategory),
            orderBy('createdAt', 'desc')
          );
        }

        const snapshot = await getDocs(q);
        const fetchedProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(fetchedProjects);
      } catch (error) {
        console.error('Error fetching projects', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [selectedCategory]);

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col section-gap">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">استكشف مشاريع الخير</h1>
        <p className="text-slate-600 text-lg">ساهم في دعم المشاريع التي تلامس قلبك وتحدث أثراً حقيقياً.</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl card-shadow border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="ابحث عن مشروع..."
            className="w-full pr-12 pl-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-sudan-green transition-all font-semibold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory('الكل')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              selectedCategory === 'الكل' ? 'bg-sudan-green text-white shadow-lg shadow-sudan-green/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat ? 'bg-sudan-green text-white shadow-lg shadow-sudan-green/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl h-[400px] animate-pulse card-shadow"></div>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-slate-200 card-shadow">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="text-slate-300" size={40} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">لم نجد أي مشاريع</h3>
          <p className="text-slate-500 font-semibold">جرب البحث بكلمات أخرى أو تغيير التصنيف.</p>
        </div>
      )}
    </div>
  );
};

export default Projects;
