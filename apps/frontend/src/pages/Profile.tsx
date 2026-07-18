import React, { useEffect, useState } from 'react';
import { api, User } from '../services/api';
import { ArrowLeft, Send, AlertCircle, CheckCircle, Trash2, Loader, Save } from 'lucide-react';

interface ProfileProps {
  onBackToDashboard: () => void;
  onAccountDeleted: () => void;
}

export const Profile: React.FC<ProfileProps> = ({ onBackToDashboard, onAccountDeleted }) => {
  const [user, setUser] = useState<User | null>(null);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await api.user.me();
        setUser(data);
        setTelegramUsername(data.telegramUsername || '');
      } catch (err: any) {
        setError(err.message || 'Error al obtener los datos del perfil.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const updatedUser = await api.user.update({ telegramUsername: telegramUsername || undefined });
      setUser(updatedUser);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      '¿ESTÁS SEGURO? Esta acción es irreversible. Se eliminarán permanentemente tu cuenta y todas tus suscripciones.'
    );
    if (!confirmed) return;

    setError(null);
    setLoading(true);

    try {
      await api.user.delete();
      onAccountDeleted();
    } catch (err: any) {
      setError(err.message || 'Error al eliminar la cuenta.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Volver al Panel
        </button>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-800 bg-gray-950">
            <h2 className="text-2xl font-bold text-gray-100">Mi Perfil</h2>
            <p className="text-sm text-gray-400 mt-1">
              Gestiona tu información de usuario y integraciones de notificaciones.
            </p>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg flex items-center gap-3 text-sm">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>Perfil actualizado exitosamente.</span>
              </div>
            )}

            {/* Read-Only Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-800">
              <div>
                <span className="block text-xs font-semibold uppercase text-gray-500 tracking-wider">Nombre de Usuario</span>
                <span className="text-lg font-medium text-gray-200 mt-1 block">{user?.username}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-gray-500 tracking-wider">Correo Electrónico</span>
                <span className="text-lg font-medium text-gray-200 mt-1 block">{user?.email}</span>
              </div>
            </div>

            {/* Update Form */}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label htmlFor="telegramUsername" className="block text-sm font-medium text-gray-400 mb-1">
                  Nombre de usuario de Telegram
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                    <Send className="w-5 h-5" />
                  </div>
                  <input
                    id="telegramUsername"
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                    placeholder="usuario_telegram"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Utilizado para enviarte notificaciones y recordatorios automáticos de tus próximas renovaciones.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50"
                >
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-gray-900 border border-red-500/20 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-8 py-5 bg-red-500/5 border-b border-red-500/10">
            <h3 className="text-lg font-bold text-red-400">Zona de Peligro</h3>
            <p className="text-xs text-gray-400 mt-1">Acciones irreversibles sobre tu cuenta.</p>
          </div>
          <div className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-gray-200">Eliminar esta cuenta</h4>
              <p className="text-sm text-gray-500 mt-0.5">
                Una vez borrada la cuenta, todos tus datos y suscripciones desaparecerán para siempre.
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-transparent rounded-lg text-sm font-semibold bg-red-650 hover:bg-red-750 text-white transition bg-red-500/10 hover:bg-red-500/20 text-red-400 self-start md:self-center"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar Cuenta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
