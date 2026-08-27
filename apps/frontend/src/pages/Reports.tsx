import React, { useEffect, useState } from 'react';
import {
  api,
  ExpenseReportResponse,
  Subscription,
  SubscriptionPayment,
  ReportQueryParams,
} from '../services/api';
import { PaymentModal } from '../components/PaymentModal';
import { formatDate } from '../utils/date';
import {
  DollarSign,
  TrendingUp,
  Download,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Filter,
  Globe,
  Loader,
  AlertCircle,
  ArrowLeft,
  User as UserIcon,
  LogOut,
  BarChart3,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  FileSpreadsheet,
  ChevronDown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface ReportsProps {
  onBackToDashboard: () => void;
  onNavigateToProfile: () => void;
  onLogout: () => void;
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

type PresetPeriod = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'custom';

export const Reports: React.FC<ReportsProps> = ({
  onBackToDashboard,
  onNavigateToProfile,
  onLogout,
}) => {
  const [report, setReport] = useState<ExpenseReportResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportMenuRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filters
  const [preset, setPreset] = useState<PresetPeriod>('this_year');
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [targetCurrency, setTargetCurrency] = useState<string>('USD');

  // Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SubscriptionPayment | null>(null);
  const [modalSub, setModalSub] = useState<Subscription | null>(null);

  // Initialize presets
  const applyPreset = (newPreset: PresetPeriod) => {
    setPreset(newPreset);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const pad = (n: number) => String(n).padStart(2, '0');

    if (newPreset === 'this_month') {
      const monthStr = `${currentYear}-${pad(currentMonth)}`;
      setStartMonth(monthStr);
      setEndMonth(monthStr);
      setStartDate('');
      setEndDate('');
    } else if (newPreset === 'last_month') {
      let y = currentYear;
      let m = currentMonth - 1;
      if (m === 0) {
        m = 12;
        y -= 1;
      }
      const monthStr = `${y}-${pad(m)}`;
      setStartMonth(monthStr);
      setEndMonth(monthStr);
      setStartDate('');
      setEndDate('');
    } else if (newPreset === 'last_3_months') {
      let startY = currentYear;
      let startM = currentMonth - 2;
      if (startM <= 0) {
        startM += 12;
        startY -= 1;
      }
      setStartMonth(`${startY}-${pad(startM)}`);
      setEndMonth(`${currentYear}-${pad(currentMonth)}`);
      setStartDate('');
      setEndDate('');
    } else if (newPreset === 'this_year') {
      setStartMonth(`${currentYear}-01`);
      setEndMonth(`${currentYear}-12`);
      setStartDate('');
      setEndDate('');
    }
  };

  useEffect(() => {
    applyPreset('this_year');
  }, []);

  const getActiveQueryParams = (): ReportQueryParams => {
    const queryParams: ReportQueryParams = {
      targetCurrency,
      subscriptionId: selectedSubId || undefined,
      status: selectedStatus || undefined,
    };
    if (preset === 'custom') {
      if (startDate) queryParams.startDate = startDate;
      if (endDate) queryParams.endDate = endDate;
      if (startMonth) queryParams.startMonth = startMonth;
      if (endMonth) queryParams.endMonth = endMonth;
    } else {
      if (startMonth) queryParams.startMonth = startMonth;
      if (endMonth) queryParams.endMonth = endMonth;
    }
    return queryParams;
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = getActiveQueryParams();
      const [reportData, subsData] = await Promise.all([
        api.payments.getReport(queryParams),
        api.subscriptions.list(),
      ]);

      setReport(reportData);
      setSubscriptions(subsData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el reporte de gastos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startMonth || startDate) {
      loadData();
    }
  }, [preset, startMonth, endMonth, startDate, endDate, selectedSubId, selectedStatus, targetCurrency]);

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const queryParams = getActiveQueryParams();
      await api.payments.downloadReportCsv(queryParams);
    } catch (err: any) {
      alert(err.message || 'Error al exportar reporte CSV.');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const queryParams = getActiveQueryParams();
      await api.payments.downloadReportPdf(queryParams);
    } catch (err: any) {
      alert(err.message || 'Error al exportar reporte PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleOpenCreatePayment = () => {
    setEditingPayment(null);
    setModalSub(null);
    setShowPaymentModal(true);
  };

  const handleOpenEditPayment = (payment: SubscriptionPayment) => {
    setEditingPayment(payment);
    setModalSub(null);
    setShowPaymentModal(true);
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro de pago?')) return;
    try {
      await api.payments.delete(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el pago.');
    }
  };

  const currencySymbol = targetCurrency === 'EUR' ? '€' : '$';

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-1.5 rounded-lg border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white transition flex items-center gap-1.5 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Panel
          </button>
          <div className="h-5 w-px bg-gray-800" />
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-lg text-white">Reportes y Gastos</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Format Selector Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={loading || exportingPdf || exportingCsv}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-semibold transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Exportar</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExportPdf();
                  }}
                  disabled={exportingPdf}
                  className="w-full px-4 py-2.5 flex items-start gap-3 hover:bg-gray-800/80 text-left transition group"
                >
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-400 group-hover:bg-red-500/20 transition">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-200 group-hover:text-white flex items-center gap-2">
                      Exportar como PDF
                      {exportingPdf && <Loader className="w-3 h-3 animate-spin text-red-400" />}
                    </div>
                    <div className="text-xs text-gray-400">Documento ejecutivo visual</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    handleExportCsv();
                  }}
                  disabled={exportingCsv}
                  className="w-full px-4 py-2.5 flex items-start gap-3 hover:bg-gray-800/80 text-left transition group border-t border-gray-800/50"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-200 group-hover:text-white flex items-center gap-2">
                      Exportar como CSV
                      {exportingCsv && <Loader className="w-3 h-3 animate-spin text-emerald-400" />}
                    </div>
                    <div className="text-xs text-gray-400">Planilla de datos para Excel</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleOpenCreatePayment}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition shadow-md shadow-emerald-900/20"
          >
            <Plus className="w-4 h-4" />
            Registrar Pago
          </button>
          <div className="h-5 w-px bg-gray-800" />
          <button
            onClick={onNavigateToProfile}
            className="p-2 rounded-lg border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white transition"
            title="Perfil"
          >
            <UserIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg border border-transparent bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Main Container */}
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

        {/* Filter Controls Bar */}
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
            {/* Period Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">
                Período:
              </span>
              {(
                [
                  { key: 'this_month', label: 'Este Mes' },
                  { key: 'last_month', label: 'Mes Anterior' },
                  { key: 'last_3_months', label: 'Últimos 3 Meses' },
                  { key: 'this_year', label: 'Año Actual' },
                  { key: 'custom', label: 'Personalizado' },
                ] as const
              ).map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    preset === p.key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Target Currency Selector */}
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium text-gray-400">Moneda del Reporte:</span>
              <select
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {AVAILABLE_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Filters: Subscriptions, Status & Custom Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Subscription Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-gray-400" />
                Suscripción
              </label>
              <select
                value={selectedSubId}
                onChange={(e) => setSelectedSubId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Todas las suscripciones</option>
                {subscriptions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Estado de Pago</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Todos los estados</option>
                <option value="PAID">Pagado (PAID)</option>
                <option value="PENDING">Pendiente (PENDING)</option>
                <option value="FAILED">Fallido (FAILED)</option>
              </select>
            </div>

            {/* Custom Range: Start Month / End Month */}
            {preset === 'custom' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Mes Inicio (YYYY-MM)
                  </label>
                  <input
                    type="month"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">
                    Mes Fin (YYYY-MM)
                  </label>
                  <input
                    type="month"
                    value={endMonth}
                    onChange={(e) => setEndMonth(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </>
            ) : (
              <div className="lg:col-span-2 flex items-center justify-end">
                <button
                  onClick={() => loadData()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Actualizar Datos
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-emerald-500" />
            <span className="ml-3 text-sm text-gray-400">Calculando reporte de gastos...</span>
          </div>
        )}

        {/* Report Content */}
        {!loading && report && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Spent */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Total Gastado ({targetCurrency})
                  </p>
                  <h3 className="text-3xl font-extrabold mt-1 text-emerald-400">
                    {currencySymbol}
                    {report.total_spent.toFixed(2)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Convertido a {targetCurrency}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              {/* Transactions Count */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Pagos Realizados
                  </p>
                  <h3 className="text-3xl font-extrabold mt-1 text-blue-400">
                    {report.paid_count}{' '}
                    <span className="text-sm font-normal text-gray-500">/ {report.payments.length}</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Transacciones registradas</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              {/* Subscriptions Paid */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Suscripciones Pagadas
                  </p>
                  <h3 className="text-3xl font-extrabold mt-1 text-indigo-400">
                    {report.subscriptions_count}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Servicios únicos con pagos</p>
                </div>
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              {/* Original Currency Breakdown */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                    Monedas Originales
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                    {Object.keys(report.currency_breakdown).length === 0 ? (
                      <span className="text-xs text-gray-500">Sin pagos en el período</span>
                    ) : (
                      Object.entries(report.currency_breakdown).map(([curr, amt]) => (
                        <span
                          key={curr}
                          className="px-2 py-0.5 rounded-md bg-gray-800 border border-gray-700 text-xs font-semibold text-gray-300"
                        >
                          {curr}: {amt.toFixed(2)}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Spending Bar Chart */}
            {report.monthly_breakdown.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-200 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                    Evolución Mensual del Gasto ({targetCurrency})
                  </h3>
                  <span className="text-xs text-gray-400">
                    {report.monthly_breakdown.length} {report.monthly_breakdown.length === 1 ? 'mes' : 'meses'} con actividad
                  </span>
                </div>

                <div className="h-72 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.monthly_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="period" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                      <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111827',
                          borderColor: '#374151',
                          borderRadius: '0.75rem',
                          color: '#F3F4F6',
                        }}
                        formatter={(value: any) => [`${currencySymbol}${Number(value).toFixed(2)} ${targetCurrency}`, 'Total Gastado']}
                        labelFormatter={(label) => `Período: ${label}`}
                      />
                      <Bar dataKey="total_amount" fill="#10B981" radius={[6, 6, 0, 0]} name="Gasto Total" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Payments History Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-200">Historial Detallado de Pagos</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {report.payments.length} transacciones registradas en el período seleccionado
                  </p>
                </div>
                <button
                  onClick={handleOpenCreatePayment}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Pago
                </button>
              </div>

              {report.payments.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  No se encontraron pagos registrados en el período seleccionado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-gray-950 text-gray-400 uppercase text-xs border-b border-gray-850">
                      <tr>
                        <th className="px-6 py-4">Fecha de Pago</th>
                        <th className="px-6 py-4">Suscripción</th>
                        <th className="px-6 py-4">Período</th>
                        <th className="px-6 py-4">Monto Original</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Método</th>
                        <th className="px-6 py-4">Notas</th>
                        <th className="px-6 py-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850">
                      {report.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-800/40 transition">
                          <td className="px-6 py-4 font-medium text-gray-200">
                            {formatDate(p.payment_date)}
                          </td>
                          <td className="px-6 py-4 font-semibold text-white">
                            {p.subscription_name}
                          </td>
                          <td className="px-6 py-4 text-xs font-mono text-gray-400">
                            {p.billing_period}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-semibold text-emerald-400">
                              {Number(p.amount).toFixed(2)} {p.currency.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                p.status === 'PAID'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : p.status === 'PENDING'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {p.status === 'PAID' && <CheckCircle2 className="w-3 h-3" />}
                              {p.status === 'PENDING' && <Clock className="w-3 h-3" />}
                              {p.status === 'FAILED' && <XCircle className="w-3 h-3" />}
                              {p.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">
                            {p.payment_method || '-'}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400 max-w-xs truncate" title={p.notes || ''}>
                            {p.notes || '-'}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditPayment(p)}
                              title="Editar Pago"
                              className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition inline-flex"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(p.id)}
                              title="Eliminar Pago"
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
          </>
        )}
      </main>

      {/* Payment Modal Component */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => loadData()}
        initialSubscription={modalSub}
        editingPayment={editingPayment}
        subscriptions={subscriptions}
      />
    </div>
  );
};
