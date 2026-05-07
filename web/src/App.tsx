import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/AuthContext';
import { ThemeProvider } from './hooks/ThemeContext';
import Layout from './components/Layout';
import VaultList from './components/VaultList';
import NoteList from './components/NoteList';
import NoteEditor from './components/NoteEditor';
import GraphView from './components/GraphView';
import ThemeEditor from './components/ThemeEditor';
import SearchPanel from './components/SearchPanel';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';

function AppRoutes() {
  const [currentVault, setCurrentVault] = useState<string>('');
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><p>Carregando...</p></div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <ThemeProvider>
      <Layout
        currentVault={currentVault}
        onVaultChange={setCurrentVault}
        user={user}
        onLogout={logout}
      >
        <Routes>
          <Route path="/" element={<VaultList onSelect={setCurrentVault} />} />
          <Route path="/notes" element={<NoteList vaultPath={currentVault} />} />
          <Route path="/notes/:path" element={<NoteEditor vaultPath={currentVault} />} />
          <Route path="/graph" element={<GraphView vaultPath={currentVault} />} />
          <Route path="/themes" element={<ThemeEditor />} />
          <Route path="/search" element={<SearchPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
