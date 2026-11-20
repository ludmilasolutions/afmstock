import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Package, LogIn, Lock, Mail } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const { showToast } = useToast();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Por favor completá todos los campos', 'warning');
      return;
    }

    try {
      setLoading(true);
      if (isRegister) {
        await register(email, password);
        showToast('Cuenta creada con éxito', 'success');
      } else {
        await login(email, password);
        showToast('Sesión iniciada correctamente', 'success');
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Error al autenticar';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Contraseña o email incorrecto';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'Usuario no encontrado';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'El email ya está registrado';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña debe tener al menos 6 caracteres';
      }
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 flex flex-col items-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
          <Package className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-black text-slate-800 tracking-tight">StockAFM</h1>
        <p className="text-xs text-slate-400 font-medium mb-6">Control y Consulta de Depósito</p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3.5">
          <Input
            label="Correo Electrónico"
            type="email"
            required
            placeholder="usuario@dominio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Contraseña"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Button
            type="submit"
            loading={loading}
            icon={<LogIn className="w-4 h-4" />}
            className="w-full mt-2"
          >
            {isRegister ? 'Crear Cuenta' : 'Ingresar al Depósito'}
          </Button>

          <div className="text-center mt-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors"
            >
              {isRegister
                ? '¿Ya tenés cuenta? Iniciar Sesión'
                : '¿No tenés cuenta? Registrarse'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

