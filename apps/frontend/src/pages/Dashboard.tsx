import React, { useEffect, useState } from 'react';
import {
  api,
  Subscription,
  DashboardInfo,
  Tag,
  SubscriptionHistory,
} from '../services/api';
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
  Tag as TagIcon,
  History as HistoryIcon,
  Globe,
  Filter,
} from 'lucide-react';

interface DashboardProps {
  onLogout: () => void;
  onNavigateToProfile: () => void;
}

const AVAILABLE_CURRENCIES = [
  { code: 'USD', name: 'USD ($)' },
  { code: 'EUR', name: 'EUR (€)' },
  { code: 'ARS', name: 'ARS ($)' },
  { code: 'MXN', name: 'MXN ($)' },
  { code: 'CLP', name: 'CLP ($)' },
  { code: 'BRL', name: 'BRL (R$)' },
  { code: 'COP', name: 'COP ($)' },
  { code: 'UYU', name: 'UYU ($)' },
  { code: 'PEN', name: 'PEN (S/)' },
];

export const Dashboard: React.FC<DashboardProps> = ({
  onLogout,
  onNavigateToProfile,
}) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [dashboardInfo, setDashboardInfo] = useState<DashboardInfo | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Create/Edit state
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formFrequency, setFormFrequency] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [formType, setFormType] = useState<'SUBSCRIPTION' | 'DOMAIN' | 'HOSTING'>('SUBSCRIPTION');
  const [formStartDate, setFormStartDate] = useState('');
  const [formNextRenewalDate, setFormNextRenewalDate] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formTagIds, setFormTagIds] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Tag inline creation inside modal
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6');
  const [creatingTag, setCreatingTag] = useState(false);

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySub, setHistorySub] = useState<Subscription | null>(null);
  const [historyList, setHistoryList] = useState<SubscriptionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = async (currency = selectedCurrency, tagFilter = selectedTagFilter) => {
    setLoading(true);
    setError(null);
    try {
      const [subs, dash, userTags] = await Promise.all([
        api.subscriptions.list(tagFilter || undefined),
        api.dashboard.getInfo(currency),
        api.tags.list(),
      ]);
      setSubscriptions(subs);
      setDashboardInfo(dash);
      setTags(userTags);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedCurrency, selectedTagFilter);
  }, [selectedCurrency, selectedTagFilter]);

  const handleCurrencyChange = (newCurrency: string) => {
    setSelectedCurrency(newCurrency);
  };

  const handleTagFilterChange = (tagId: string) => {
    setSelectedTagFilter(tagId);
  };

  const handleOpenCreateModal = () => {
    setEditingSub(null);
    setFormName('');
    setFormPrice('');
    setFormCurrency('USD');
    setFormFrequency('MONTHLY');
    setFormType('SUBSCRIPTION');
    const today = new Date().toISOString().split('T')[0];
    setFormStartDate(today);
    setFormNextRenewalDate(today);
    setFormIsActive(true);
    setFormTagIds([]);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setFormName(sub.name);
    setFormPrice(sub.price.toString());
    setFormCurrency(sub.currency.toUpperCase());
    setFormFrequency(sub.frequency);
    setFormType(sub.type || 'SUBSCRIPTION');
    setFormStartDate(sub.start_date.split('T')[0]);
    setFormNextRenewalDate(sub.next_renewal_date.split('T')[0]);
    setFormIsActive(sub.is_active);
    setFormTagIds(sub.tags ? sub.tags.map((t) => t.id) : []);
    setFormError(null);
    setShowModal(true);
  };

  const handleCreateTagInline = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      const created = await api.tags.create({
        name: newTagName.trim(),
        color: newTagColor,
      });
      setTags([...tags, created]);
      setFormTagIds([...formTagIds, created.id]);
      setNewTagName('');
    } catch (err: any) {
      alert(err.message || 'Error al crear etiqueta.');
    } finally {
      setCreatingTag(false);
    }
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
      currency: formCurrency.toUpperCase(),
      frequency: formFrequency,
      type: formType,
      start_date: formStartDate,
      next_renewal_date: formNextRenewalDate,
      is_active: formIsActive,
      tagIds: formTagIds,
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

  const handleOpenHistory = async (sub: Subscription) => {
    setHistorySub(sub);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const history = await api.subscriptions.getHistory(sub.id);
      setHistoryList(history);
    } catch (err: any) {
      alert(err.message || 'Error al obtener el historial.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleTagSelection = (tagId: string) => {
    if (formTagIds.includes(tagId)) {
      setFormTagIds(formTagIds.filter((id) => id !== tagId));
    } else {
      setFormTagIds([...formTagIds, tagId]);
    }
  };

  if (loading && subscriptions.length === 0) {
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-transparent text-sm font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
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
            <button onClick={() => loadData()} className="hover:text-white transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Currency & Filter Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Moneda Preferida:</span>
            <select
              value={selectedCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AVAILABLE_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-medium text-gray-300">Filtrar por Etiqueta:</span>
            <select
              value={selectedTagFilter}
              onChange={(e) => handleTagFilterChange(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas las etiquetas</option>
              {tags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  🏷️ {tag.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-sm font-medium text-gray-400">Gasto Mensual Estimado ({selectedCurrency})</p>
              <h3 className="text-3xl font-bold mt-1 text-blue-400">
                {selectedCurrency === 'EUR' ? '€' : '$'}
                {dashboardInfo?.monthlySpending?.toFixed(2) || '0.00'}
              </h3>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center justify-between shadow-lg">
            <div>
              <p className="text-sm font-medium text-gray-400">Gasto Anual Estimado ({selectedCurrency})</p>
              <h3 className="text-3xl font-bold mt-1 text-indigo-400">
                {selectedCurrency === 'EUR' ? '€' : '$'}
                {dashboardInfo?.yearlySpending?.toFixed(2) || '0.00'}
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
        {dashboardInfo && dashboardInfo.nextRenewal && dashboardInfo.nextRenewal.length > 0 && (
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
          <div className="px-6 py-5 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-200">Suscripciones</h3>
              {selectedTagFilter && (
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                  Filtrado por etiqueta
                  <button onClick={() => setSelectedTagFilter('')} className="hover:text-white ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
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
              No tienes ninguna suscripción registrada {selectedTagFilter ? 'con esta etiqueta' : ''}. ¡Crea la primera para comenzar!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-950 text-gray-400 uppercase text-xs border-b border-gray-850">
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Etiquetas</th>
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
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            sub.type === 'DOMAIN'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : sub.type === 'HOSTING'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}
                        >
                          {sub.type === 'DOMAIN' ? 'Dominio' : sub.type === 'HOSTING' ? 'Hosting' : 'Suscripción'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {sub.tags && sub.tags.length > 0 ? (
                            sub.tags.map((t) => (
                              <span
                                key={t.id}
                                className="px-2 py-0.5 rounded text-xs font-medium text-white flex items-center gap-1"
                                style={{ backgroundColor: t.color || '#3b82f6' }}
                              >
                                {t.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {sub.price.toFixed(2)} <span className="uppercase text-xs text-gray-500">{sub.currency}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            sub.frequency === 'MONTHLY' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'
                          }`}
                        >
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
                          onClick={() => handleOpenHistory(sub)}
                          title="Ver Historial"
                          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-indigo-400 rounded transition inline-flex"
                        >
                          <HistoryIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(sub)}
                          title="Editar"
                          className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition inline-flex"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubscription(sub.id)}
                          title="Eliminar"
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

      {/* Subscription History Modal */}
      {showHistoryModal && historySub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
              <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                <HistoryIcon className="w-5 h-5 text-indigo-400" />
                Historial de Precios y Frecuencia: {historySub.name}
              </h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-96 overflow-y-auto space-y-4">
              {historyLoading ? (
                <div className="text-center py-6 text-gray-400">
                  <Loader className="w-6 h-6 animate-spin text-indigo-500 mx-auto mb-2" />
                  Cargando historial...
                </div>
              ) : historyList.length === 0 ? (
                <p className="text-center text-gray-500 py-6">
                  No hay cambios registrados en el historial de esta suscripción.
                </p>
              ) : (
                <div className="space-y-3">
                  {historyList.map((item) => (
                    <div
                      key={item.id}
                      className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>Fecha de cambio: {item.effective_date}</span>
                        <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <div>
                          <span className="text-gray-400 text-xs">Precio: </span>
                          <span className="font-semibold text-gray-200">
                            {item.old_price !== undefined ? `${item.old_price} → ` : ''}
                            {item.new_price} {item.currency}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 text-xs">Frecuencia: </span>
                          <span className="font-semibold text-indigo-300">
                            {item.old_frequency ? `${item.old_frequency} → ` : ''}
                            {item.new_frequency}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex justify-end bg-gray-950">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Modal Form (Create/Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
              <h3 className="text-lg font-bold text-gray-100">
                {editingSub ? 'Editar Suscripción' : 'Nueva Suscripción'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="p-6 space-y-4 overflow-y-auto">
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

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Tipo de Servicio</label>
                <select
                  required
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as 'SUBSCRIPTION' | 'DOMAIN' | 'HOSTING')}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition"
                >
                  <option value="SUBSCRIPTION">Suscripción</option>
                  <option value="DOMAIN">Dominio</option>
                  <option value="HOSTING">Hosting</option>
                </select>
              </div>

              {/* Tag Management / Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-1">
                  <TagIcon className="w-4 h-4 text-indigo-400" />
                  Etiquetas Personalizadas
                </label>
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-950 border border-gray-800 rounded-lg max-h-28 overflow-y-auto">
                  {tags.length === 0 ? (
                    <span className="text-gray-500 text-xs">No tienes etiquetas creadas.</span>
                  ) : (
                    tags.map((tag) => {
                      const isSelected = formTagIds.includes(tag.id);
                      return (
                        <button
                          type="button"
                          key={tag.id}
                          onClick={() => toggleTagSelection(tag.id)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                            isSelected
                              ? 'ring-2 ring-white border-transparent text-white'
                              : 'opacity-60 hover:opacity-100 text-gray-300'
                          }`}
                          style={{ backgroundColor: tag.color || '#3b82f6' }}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                          {tag.name}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Inline Tag Creation */}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nueva etiqueta..."
                    className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 placeholder-gray-500"
                  />
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                    title="Color de etiqueta"
                  />
                  <button
                    type="button"
                    onClick={handleCreateTagInline}
                    disabled={creatingTag || !newTagName.trim()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                  >
                    + Agregar
                  </button>
                </div>
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
                    {AVAILABLE_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
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

              <div className="flex items-center gap-3 py-1">
                <input
                  id="formIsActive"
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                />
                <label htmlFor="formIsActive" className="text-sm font-medium text-gray-300 cursor-pointer select-none">
                  Suscripción Activa
                </label>
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
