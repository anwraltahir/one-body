import React from 'react';
import { Link } from 'react-router-dom';
import { Project } from '../types';
import { motion } from 'motion/react';
import { Users, Target, Calendar } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const progress = Math.min((project.currentAmount / project.targetAmount) * 100, 100);

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl overflow-hidden card-shadow border border-slate-100 flex flex-col h-full"
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={project.imageUrl || `https://picsum.photos/seed/${project.id}/800/600`}
          alt={project.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-sudan-green">
          {project.category}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-grow gap-4">
        <h3 className="text-xl font-bold text-slate-900 line-clamp-1">
          {project.title}
        </h3>
        
        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed h-10">
          {project.description}
        </p>

        <div className="space-y-2 mt-2">
          <div className="flex justify-between text-sm font-bold">
            <span className="text-sudan-green">{Math.round(progress)}%</span>
            <span className="text-slate-400">المستهدف: {project.targetAmount.toLocaleString()} ج.س</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-sudan-green"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-bold">تم جمع</span>
            <span className="text-lg font-bold text-slate-900">{project.currentAmount.toLocaleString()} ج.س</span>
          </div>
          <Link
            to={`/projects/${project.id}`}
            className="btn-primary py-2 px-5 text-sm"
          >
            تبرع الآن
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectCard;
