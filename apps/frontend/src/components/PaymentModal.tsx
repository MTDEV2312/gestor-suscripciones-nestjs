import React, { useEffect, useState } from 'react';
import {
  api,
  Subscription,
  SubscriptionPayment,
  CreatePaymentPayload,
} from '../services/api';
import { getLocalTodayString } from '../utils/date';
import {
  X,
  DollarSign,
  AlertCircle,
  Calendar,
  CreditCard,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSubscription?: Subscription | null;
  editingPayment?: SubscriptionPayment | null;
  subscriptions?: Subscription[];
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

const PAYMENT_METHODS = [
  'Tarjeta de Crédito',
  'Tarjeta de Débito',
  'PayPal',
  'Transferencia Bancaria',
  'Mercado Pago',
  'Efectivo',
  'Criptomoneda',
  'Otro',
];

const MONTHS = [
  { value: 1, label: '01 - Enero' },
  { value: 2, label: '02 - Febrero' },
  { value: 3, label: '03 - Marzo' },
  { value: 4, label: '04 - Abril' },
  { value: 5, label: '05 - Mayo' },
  { value: 6, label: '06 - Junio' },
  { value: 7, label: '07 - Julio' },
  { value: 8, label: '08 - Agosto' },
  { value: 9, label: '09 - Septiembre' },
  { value: 10, label: '10 - Octubre' },
  { value: 11, label: '11 - Noviembre' },
  { value: 12, label: '12 - Diciembre' },
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialSubscription = null,
  editingPayment = null,
  subscriptions = [],
}) => {
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [subscriptionName, setSubscriptionName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paymentDate, setPaymentDate] = useState('');
  const [billingMonth, setBillingMonth] = useState<number>(new Date().getMonth() + 1);
  const [billingYear, setBillingYear] = useState<number>(new Date().getFullYear());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState<string>('PAID');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setDuplicateWarning(null);

    if (editingPayment) {
      setSelectedSubId(editingPayment.subscription_id || '');
      setSubscriptionName(editingPayment.subscription_name);
      setAmount(editingPayment.amount.toString());
      setCurrency(editingPayment.currency.toUpperCase());
      setPaymentDate(editingPayment.payment_date ? editingPayment.payment_date.split('T')[0] : getLocalTodayString());
      setBillingMonth(editingPayment.billing_month);
      setBillingYear(editingPayment.billing_year);
      setPaymentMethod(editingPayment.payment_method || '');
      setStatus(editingPayment.status || 'PAID');
      setNotes(editingPayment.notes || '');
    } else if (initialSubscription) {
      setSelectedSubId(initialSubscription.id);
      setSubscriptionName(initialSubscription.name);
      setAmount(initialSubscription.price.toString());
      setCurrency(initialSubscription.currency.toUpperCase());
      const today = getLocalTodayString();
      setPaymentDate(today);
      const now = new Date();
      setBillingMonth(now.getMonth() + 1);
      setBillingYear(now.getFullYear());
      setPaymentMethod('Tarjeta de Crédito');
      setStatus('PAID');
      setNotes('');
    } else {
      setSelectedSubId('');
      setSubscriptionName('');
      setAmount('');
      setCurrency('USD');
      const today = getLocalTodayString();
      setPaymentDate(today);
      const now = new Date();
      setBillingMonth(now.getMonth() + 1);
      setBillingYear(now.getFullYear());
      setPaymentMethod('Tarjeta de Crédito');
      setStatus('PAID');
      setNotes('');
    }
  }, [isOpen, initialSubscription, editingPayment]);

  const handleSubscriptionSelect = (subId: string) => {
    setSelectedSubId(subId);
    if (subId) {
      const sub = subscriptions.find((s) => s.id === subId);
      if (sub) {
        setSubscriptionName(sub.name);
        if (!amount || amount === '0') {
          setAmount(sub.price.toString());
        }
        setCurrency(sub.currency.toUpperCase());
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent, allowDuplicate = false) => {
    if (e) e.preventDefault();
    setError(null);
    setDuplicateWarning(null);
    setLoading(true);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('El monto debe ser un número positivo.');
      setLoading(false);
      return;
    }

    if (!subscriptionName.trim()) {
      setError('El nombre de la suscripción es obligatorio.');
      setLoading(false);
      return;
    }

    const payload: CreatePaymentPayload = {
      subscription_id: selectedSubId || undefined,
      subscription_name: subscriptionName.trim(),
      amount: amountNum,
      currency: currency.toUpperCase(),
      payment_date: paymentDate,
      billing_month: billingMonth,
      billing_year: billingYear,
      payment_method: paymentMethod.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
      allow_duplicate: allowDuplicate,
    };

    try {
      if (editingPayment) {
        await api.payments.update(editingPayment.id, payload);
      } else {
        await api.payments.create(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.status === 409 || (err.message && err.message.includes('Ya existe un pago'))) {
        setDuplicateWarning(
          'Ya existe un pago registrado para esta suscripción en este período de facturación. ¿Deseas registrar un pago adicional de todas formas?',
        );
      } else {
        setError(err.message || 'Error al procesar el pago.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950">
          <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            {editingPayment ? 'Editar Registro de Pago' : 'Registrar Pago de Suscripción'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-200">Aviso de Pago Duplicado</p>
                  <p className="mt-1 text-gray-300">{duplicateWarning}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(undefined, true)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Registrar de todas formas'}
                </button>
              </div>
            </div>
          )}

          {/* Subscription Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Suscripción Asociada (Opcional)
            </label>
            <select
              value={selectedSubId}
              onChange={(e) => handleSubscriptionSelect(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
            >
              <option value="">-- Pago Manual / Sin Vincular --</option>
              {subscriptions.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({sub.price} {sub.currency} - {sub.frequency === 'MONTHLY' ? 'Mensual' : 'Anual'})
                </option>
              ))}
            </select>
          </div>

          {/* Subscription Name Snapshot */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Nombre o Concepto del Pago *
            </label>
            <input
              type="text"
              required
              value={subscriptionName}
              onChange={(e) => setSubscriptionName(e.target.value)}
              placeholder="ej. Netflix Premium, Hosting Anual..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
            />
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Monto Pagado *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="15.99"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Moneda *</label>
              <select
                required
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
              >
                {AVAILABLE_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payment Date and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-blue-400" />
                Fecha de Pago *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
              >
                <option value="PAID">Pagado (PAID)</option>
                <option value="PENDING">Pendiente (PENDING)</option>
                <option value="FAILED">Fallido (FAILED)</option>
              </select>
            </div>
          </div>

          {/* Billing Period (Month & Year) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Mes del Período *
              </label>
              <select
                value={billingMonth}
                onChange={(e) => setBillingMonth(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Año del Período *
              </label>
              <input
                type="number"
                required
                min={2000}
                max={2100}
                value={billingYear}
                onChange={(e) => setBillingYear(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm transition"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-1">
              <CreditCard className="w-4 h-4 text-purple-400" />
              Método de Pago
            </label>
            <div className="flex gap-2">
              <select
                value={PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : paymentMethod ? 'Otro' : ''}
                onChange={(e) => {
                  if (e.target.value !== 'Otro') {
                    setPaymentMethod(e.target.value);
                  }
                }}
                className="w-1/2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Seleccionar método...</option>
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="o escribe otro método..."
                className="w-1/2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-1">
              <FileText className="w-4 h-4 text-gray-400" />
              Notas o Comentarios
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Número de comprobante, factura o notas opcionales..."
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-gray-800 flex justify-end gap-3 bg-gray-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-700 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Guardando...' : editingPayment ? 'Guardar Cambios' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
