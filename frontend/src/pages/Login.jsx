import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-background to-indigo-50 dark:from-indigo-950/30 dark:via-background dark:to-indigo-950/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-card flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 overflow-hidden border border-border">
            <img src="/logo.jpeg" alt="Sabonesa Dental" className="w-full h-full object-cover" />
          </div>
          <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            Sabonesa Dental Clinic Y Spa
          </CardTitle>
          <CardDescription className="text-base">
            Gestión integral de consultorio dental
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 text-sm text-red-600 dark:text-red-300 text-center">
                {errorMsg}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@betty.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer"
            >
              {submitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
