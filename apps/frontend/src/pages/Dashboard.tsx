import React, { useEffect, useState } from 'react';
import { api, Subscription, DashboardInfo } from '../services/api';
import { SubscriptionCharts } from '../components/SubscriptionCharts';
import {
  Plus,
  Trash2,
  Edit2,
  Calendar,
  DollarSign,
  TrendingUp,
  Loader,
  AlertCircle,
  Check,
  X,
  RefreshCw,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
  onNavigateToProfile: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, onNavigateToProfile }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [dashboardInfo, setDashboardInfo] = useState<DashboardInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states for Create/Edit
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCurrency, setFormCurrency] = useState('usd');
  const [formFrequency, setFormFrequency] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [formStartDate, setFormStartDate] = useState('');
  const [formNextRenewalDate, setFormNextRenewalDate] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [subs, dash] = await Promise.all([
        api.subscriptions.list(),
        api.dashboard.getInfo(),
      ]);
      setSubscriptions(subs);
      setDashboardInfo(dash);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingSub(null);
    setFormName('');
    setFormPrice('');
    setFormCurrency('usd');
    setFormFrequency('MONTHLY');
    // Set default dates to today
    const today = new Date().toISOString().split('T')[0];
    setFormStartDate(today);
    setFormNextRenewalDate(today);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setFormName(sub.name);
    setFormPrice(sub.price.toString());
    setFormCurrency(sub.currency);
    setFormFrequency(sub.frequency);
    setFormStartDate(sub.start_date.split('T')[0]);
    setFormNextRenewalDate(sub.next_renewal_date.split('T')[0]);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('El precio debe ser un número positivo.');
      setFormLoading(false);
      return;
    }

    const payload = {
      name: formName,
      price: priceNum,
      currency: formCurrency.toLowerCase(),
      frequency: formFrequency,
      start_date: formStartDate,
      next_renewal_date: formNextRenewalDate,
    };

    try {
      if (editingSub) {
        await api.subscriptions.update(editingSub.id, payload);
      } else {
        await api.subscriptions.create(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la suscripción.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta suscripción?')) return;
    try {
      await api.subscriptions.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar la suscripción.');
    }
  };

  const handleToggleActive = async (sub: Subscription) => {
    try {
      await api.subscriptions.update(sub.id, { is_active: !sub.is_active });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al cambiar el estado.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <Loader className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Cargando datos del panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📅</span>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            GestorSuscripciones
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onNavigateToProfile}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-800 text-sm font-medium hover:bg-gray-800 transition"
          >
            <UserIcon className="w-4 h-4 text-gray-400" />
            Perfil
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-transparent text-sm font-medium bg-red-650 hover:bg-red-750 text-white transition bg-red-500/10 hover:bg-red-500/20 text-red-400"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={loadData} className="hover:text-white transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-sm font-medium text-gray-400">Gasto Mensual Estimado</p>
              <h3 className="text-3xl font-bold mt-1 text-blue-400">
                ${dashboardInfo?.monthlySpending.toFixed(2) || '0.00'}
              </h3>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-sm font-medium text-gray-400">Gasto Anual Estimado</p>
              <h3 className="text-3xl font-bold mt-1 text-indigo-400">
                ${dashboardInfo?.yearlySpending.toFixed(2) || '0.00'}
              </h3>
            </div>
            <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-500">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Suscripciones</p>
              <h3 className="text-3xl font-bold mt-1 text-emerald-400">{subscriptions.length}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Next Renewals Section */}
        {dashboardInfo && dashboardInfo.nextRenewal.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-200 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              Próximas Renovaciones (Este Mes)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardInfo.nextRenewal.map((renew, idx) => (
                <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex justify-between items-center">
                  <span className="font-semibold text-gray-300">{renew.name}</span>
                  <span className="text-sm text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                    {new Date(renew.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts */}
        {subscriptions.length > 0 && (
          <SubscriptionCharts subscriptions={subscriptions} />
        )}

        {/* Subscriptions List Section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-lg">
          <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-200">Suscripciones</h3>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition"
            >
              <Plus className="w-4 h-4" />
              Nueva Suscripción
            </button>
          </div>

          {subscriptions.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No tienes ninguna suscripción registrada. ¡Crea la primera para comenzar!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-950 text-gray-400 uppercase text-xs border-b border-gray-850">
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Precio</th>
                    <th className="px-6 py-4">Frecuencia</th>
                    <th className="px-6 py-4">Próxima Renovación</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4 font-semibold text-white">{sub.name}</td>
                      <td className="px-6 py-4">
                        {sub.price.toFixed(2)} <span className="uppercase text-xs text-gray-500">{sub.currency}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          sub.frequency === 'MONTHLY' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {sub.frequency === 'MONTHLY' ? 'Mensual' : 'Anual'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(sub.next_renewal_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(sub)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                            sub.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                        >
                          {sub.is_active ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Activa
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              Pausada
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditModal(sub)}
                          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition inline-flex"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubscription(sub.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition inline-flex"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Subscription Modal Form (Create/Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
              <h3 className="text-lg font-bold text-gray-100">
                {editingSub ? 'Editar Suscripción' : 'Nueva Suscripción'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-3 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                  placeholder="ej. Netflix, Spotify"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                    placeholder="12.99"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Moneda</label>
                  <select
                    required
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                  >
                    <option value="usd">USD ($)</option>
                    <option value="ars">ARS ($)</option>
                    <option value="eur">EUR (€)</option>
                    <option value="brl">BRL (R$)</option>
                    <option value="clp">CLP ($)</option>
                    <option value="cop">COP ($)</option>
                    <option value="mxn">MXN ($)</option>
                    <option value="uyu">UYU ($)</option>
                    <option value="pen">PEN (S/)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Frecuencia</label>
                <select
                  value={formFrequency}
                  onChange={(e) => setFormFrequency(e.target.value as 'MONTHLY' | 'YEARLY')}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                >
                  <option value="MONTHLY">Mensual</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de Inicio</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Siguiente Renovación</label>
                  <input
                    type="date"
                    required
                    value={formNextRenewalDate}
                    onChange={(e) => setFormNextRenewalDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800 flex justify-end gap-3 bg-gray-900">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-700 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  {formLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
