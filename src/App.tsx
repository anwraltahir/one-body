/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Projects from './pages/Projects';
import CreateProject from './pages/CreateProject';
import ProjectDetails from './pages/ProjectDetails';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import About from './pages/About';
import Login from './pages/Login';
import Chatbot from './components/Chatbot';
import DirectDonateButton from './components/DirectDonateButton';
import ErrorBoundary from './components/ErrorBoundary';
import { siteApi } from './lib/api';
import logo from './assets/logo.png';
import developerLogo from './assets/developer.jpg';

function AppShell() {
  const { t, isAr, dir } = useLanguage();
  const [footerText, setFooterText] = useState(
    isAr ? 'صنع بحب لأجل السودان' : 'Made with love for Sudan',
  );
  const [siteName, setSiteName] = useState(t('siteName'));

  useEffect(() => {
    siteApi
      .settings()
      .then((s) => {
        if (s.footerText) setFooterText(s.footerText);
        if (s.siteName) setSiteName(s.siteName);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    document.title = siteName || t('siteName');
  }, [siteName, t]);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans" dir={dir}>
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route path="/create-project" element={<CreateProject />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </main>
        <Chatbot />
        <DirectDonateButton />
        <footer className="bg-white border-t border-slate-200 py-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <img src={logo} alt={siteName} className="w-12 h-12 object-contain" />
              <span className="text-lg font-bold text-slate-900">{siteName}</span>
            </div>
            <p className="text-slate-500 text-sm">
              © 2026 {isAr ? 'منصة' : ''} {siteName} — {t('allRights')}
            </p>
            <p className="text-slate-400 text-xs mt-2">{footerText}</p>

            <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <span className="font-semibold">
                {isAr ? 'تطوير وتصميم الموقع:' : 'Developed & designed by:'}
              </span>
              <a
                href="mailto:anwraltahir@gmail.com"
                className="hover:opacity-85 transition-opacity"
                title="Contact developer"
              >
                <img
                  src={developerLogo}
                  alt="د. أنور الطاهر"
                  className="h-12 object-contain rounded-lg border border-slate-100 shadow-sm"
                />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
