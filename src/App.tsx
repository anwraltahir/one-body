/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Projects from './pages/Projects';
import CreateProject from './pages/CreateProject';
import ProjectDetails from './pages/ProjectDetails';
import Dashboard from './pages/Dashboard';
import About from './pages/About';
import Chatbot from './components/Chatbot';
import ErrorBoundary from './components/ErrorBoundary';
import logo from './assets/logo.png';
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/create-project" element={<CreateProject />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/about" element={<About />} />
              {/* Add more routes as needed */}
            </Routes>
          </main>
          <Chatbot />
          <footer className="bg-white border-t border-slate-200 py-12">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <img src={logo} alt="الجسد الواحد" className="w-12 h-12 object-contain" />
                <span className="text-lg font-bold text-slate-900">الجسد الواحد</span>
              </div>
              <p className="text-slate-500 text-sm">© 2026 منصة الجسد الواحد - جميع الحقوق محفوظة</p>
              <p className="text-slate-400 text-xs mt-2">صنع بحب لأجل السودان</p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  </ErrorBoundary>
  );
}

