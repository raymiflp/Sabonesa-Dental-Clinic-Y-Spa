import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

const iconVariants = {
  confirm: { icon: AlertTriangle, className: 'text-amber-500' },
  danger: { icon: XCircle, className: 'text-red-500' },
  success: { icon: CheckCircle2, className: 'text-green-500' },
  info: { icon: Info, className: 'text-blue-500' },
};

export default function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'confirm',
  loading = false,
}) {
  const { icon: Icon, className } = iconVariants[variant] || iconVariants.confirm;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`p-1.5 rounded-full bg-opacity-10 ${className.replace('text-', 'bg-').replace('500', '100')}`}>
              <Icon className={`w-5 h-5 ${className}`} />
            </div>
            <div>
              <DialogTitle className="text-base">{title || 'Confirmar'}</DialogTitle>
              {description && (
                <DialogDescription className="mt-1 text-sm text-gray-500">
                  {description}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelText}
          </Button>
          {onConfirm && (
            <Button
              onClick={onConfirm}
              disabled={loading}
              className={
                variant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : variant === 'success'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }
            >
              {loading ? 'Procesando...' : confirmText}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
