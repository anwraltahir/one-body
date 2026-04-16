import React from 'react';
import { motion } from 'motion/react';
import { Heart, ShieldCheck, Zap, Users, Target, CheckCircle2 } from 'lucide-react';

const About: React.FC = () => {
  const stats = [
    { label: 'متبرع نشط', value: '5,000+', icon: Users },
    { label: 'مشروع مكتمل', value: '1,200+', icon: CheckCircle2 },
    { label: 'ولاية سودانية', value: '18', icon: Target },
  ];

  const values = [
    {
      title: 'الشفافية المطلقة',
      description: 'نؤمن بأن الثقة تبنى بالوضوح، لذا نوفر تتبعاً لحظياً لكل قرش يتم التبرع به.',
      icon: ShieldCheck,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'التكافل الاجتماعي',
      description: 'نسعى لتعزيز قيم الجسد الواحد في المجتمع السوداني، حيث يشد بعضنا بعضاً.',
      icon: Heart,
      color: 'bg-red-50 text-red-600',
    },
    {
      title: 'الابتكار في العطاء',
      description: 'نستخدم أحدث التقنيات لتسهيل عملية التبرع وإدارة المشاريع الخيرية بذكاء.',
      icon: Zap,
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col section-gap">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto flex flex-col gap-6">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight"
        >
          عن منصة <span className="text-sudan-green">الجسد الواحد</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-slate-600 leading-relaxed"
        >
          نحن منصة رقمية سودانية رائدة، تهدف إلى رقمنة العمل الخيري وتحويله إلى نظام ذكي، شفاف، ومستدام يربط بين المتبرعين والمشاريع الأكثر احتياجاً في السودان.
        </motion.p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-8 rounded-3xl card-shadow border border-slate-100 text-center flex flex-col items-center gap-4"
          >
            <div className="w-12 h-12 bg-sudan-green/10 text-sudan-green rounded-2xl flex items-center justify-center">
              <stat.icon size={24} />
            </div>
            <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</div>
          </motion.div>
        ))}
      </section>

      {/* Mission & Vision */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-10">
        <div className="flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-slate-900">رؤيتنا ورسالتنا</h2>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl card-shadow border-r-4 border-sudan-green">
              <h3 className="text-xl font-bold text-sudan-green mb-2">الرسالة</h3>
              <p className="text-slate-600 leading-relaxed">
                تمكين الأفراد والمؤسسات من إنشاء وإدارة مشاريع خيرية ذات أثر ملموس، مع ضمان وصول التبرعات لمستحقيها بأعلى معايير النزاهة والتقنية.
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl card-shadow border-r-4 border-sudan-gold">
              <h3 className="text-xl font-bold text-sudan-gold mb-2">الرؤية</h3>
              <p className="text-slate-600 leading-relaxed">
                أن نكون المنصة الأولى والموثوقة للعمل الخيري في السودان، ونموذجاً يحتذى به في التكافل الاجتماعي الرقمي عالمياً.
              </p>
            </div>
          </div>
        </div>
        <div className="relative rounded-3xl overflow-hidden h-[400px] card-shadow">
          <img 
            src="https://picsum.photos/seed/sudan-solidarity/800/600" 
            alt="Solidarity" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-sudan-green/20 mix-blend-multiply"></div>
        </div>
      </section>

      {/* Values */}
      <section className="flex flex-col gap-10">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">قيمنا الجوهرية</h2>
          <p className="text-slate-600">المبادئ التي تحرك كل خطوة نقوم بها في المنصة.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-8 rounded-3xl card-shadow border border-slate-100 flex flex-col gap-6 hover:border-sudan-green transition-all group"
            >
              <div className={`w-14 h-14 ${value.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <value.icon size={28} />
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-xl font-bold text-slate-900">{value.title}</h3>
                <p className="text-slate-600 leading-relaxed text-sm font-semibold">
                  {value.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-slate-900 rounded-[40px] p-12 text-center text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sudan-green/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-sudan-gold/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10 max-w-2xl mx-auto flex flex-col gap-8">
          <h2 className="text-3xl md:text-4xl font-bold">كن جزءاً من التغيير اليوم</h2>
          <p className="text-slate-300 text-lg leading-relaxed">
            سواء كنت متبرعاً، أو صاحب فكرة لمشروع خيري، منصة الجسد الواحد هي المكان الأمثل لتبدأ رحلة العطاء.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-primary text-lg px-10 py-4">تبرع الآن</button>
            <button className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-10 py-4 rounded-xl font-bold hover:bg-white/20 transition-all">تواصل معنا</button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default About;
