import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { AuthCallback } from './components/AuthCallback';
import { LoginComplete } from './components/LoginComplete';
import { LoginInstructions } from './components/LoginInstructions';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/auth/login" element={<LoginInstructions />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/complete" element={<LoginComplete />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
