import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import HistorialClinico from './pages/HistorialClinico';
import Agenda from './pages/Agenda';
import Crediticio from './pages/Crediticio';
import Procedimientos from './pages/Procedimientos';
import Inventario from './pages/Inventario';

export default function App() {
  return (
    <AuthProvider>
      <Toaster richColors position="top-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/historial" element={<PatientList />} />
            <Route path="/historial/:pacienteId" element={<HistorialClinico />} />
            <Route path="/crediticio" element={<Crediticio />} />
            <Route path="/procedimientos" element={<Procedimientos />} />
            <Route path="/inventario" element={<Inventario />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
