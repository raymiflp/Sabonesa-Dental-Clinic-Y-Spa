import { useState } from 'react';
import { api } from '../api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2 } from 'lucide-react';

export default function PasswordConfirmDialog({ open, onOpenChange, onConfirm, title, description }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Ingresa tu contraseña');
      return;
    }

    setSubmitting(true);
    try {
      await api.verifyPassword(password);
      setPassword('');
      setError('');
      onConfirm();
    } catch (err) {
      let msg = 'Contraseña incorrecta';
      try {
        const parsed = JSON.parse(err.message);
        msg = parsed.error || msg;
      } catch {
        msg = err.message || msg;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-500" />
            {title || 'Confirmar contraseña'}
          </DialogTitle>
          <DialogDescription>
            {description || 'Ingresa tu contraseña para confirmar esta acción.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              placeholder="Ingresa tu contraseña"
              disabled={submitting}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
