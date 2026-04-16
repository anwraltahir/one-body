import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { getChatResponse } from '../services/geminiService';

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'مرحباً بك في منصة الجسد الواحد. أنا مساعدك الذكي، كيف يمكنني مساعدتك في عمل الخير اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await getChatResponse(userMessage, history);
    setMessages(prev => [...prev, { role: 'model', text: response || '' }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 left-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white w-[350px] h-[500px] rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-sudan-green p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot size={20} />
                </div>
                <div>
                  <div className="font-bold text-sm">مساعد الجسد الواحد</div>
                  <div className="text-[10px] opacity-80">متصل الآن</div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-full">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-slate-100 text-slate-800 rounded-tr-none' 
                      : 'bg-sudan-green/10 text-sudan-green rounded-tl-none font-medium'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-end">
                  <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="اكتب رسالتك..."
                  className="w-full pr-4 pl-12 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-sudan-green"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button
                  onClick={handleSend}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-sudan-green text-white rounded-lg flex items-center justify-center hover:bg-opacity-90 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-sudan-green text-white rounded-full shadow-xl flex items-center justify-center hover:bg-opacity-90 transition-all"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={28} />}
      </motion.button>
    </div>
  );
};

export default Chatbot;
