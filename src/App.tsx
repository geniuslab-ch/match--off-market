import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import BuyerForm from './components/BuyerForm';
import SellerForm from './components/SellerForm';
import Landing from './components/Landing';
import SearchPreview from './components/SearchPreview';
import Admin from './components/Admin';
import Privacy from './components/Privacy';
import PropertyImport from './components/PropertyImport';
import SearchImport from './components/SearchImport';
import type { ReactNode } from 'react';

// Route protégée : redirige vers /auth si non connecté
function PrivateRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-500">Chargement...</div>;
  return session ? <>{children}</> : <Navigate to="/auth" replace />;
}

// Redirige les utilisateurs déjà connectés
function PublicRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-500">Chargement...</div>;
  return session ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Page d'accueil publique (les personnes connectées vont au tableau de bord) */}
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />

      {/* Démonstration avec des données fictives */}
      <Route path="/demo" element={<Dashboard demo />} />

      {/* Aperçu public d'une recherche d'acheteur (lien à transférer) */}
      <Route path="/recherche/:id" element={<SearchPreview />} />

      {/* Auth */}
      <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />

      {/* Formulaires protégés */}
      <Route path="/buyer/new" element={<PrivateRoute><BuyerForm /></PrivateRoute>} />
      <Route path="/buyer/import" element={<PrivateRoute><SearchImport /></PrivateRoute>} />
      <Route path="/seller/new" element={<PrivateRoute><SellerForm /></PrivateRoute>} />
      <Route path="/seller/edit/:id" element={<PrivateRoute><SellerForm key="edit" /></PrivateRoute>} />
      <Route path="/seller/import" element={<PrivateRoute><PropertyImport /></PrivateRoute>} />

      {/* Dashboard connecté */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />

      {/* Déclaration de confidentialité (publique) */}
      <Route path="/confidentialite" element={<Privacy />} />

      {/* Administration : suivi des ventes (la base refuse l'accès aux non-administrateurs) */}
      <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
