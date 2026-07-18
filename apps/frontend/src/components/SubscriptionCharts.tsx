import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { Subscription } from '../services/api';

interface SubscriptionChartsProps {
  subscriptions: Subscription[];
}

export const SubscriptionCharts: React.FC<SubscriptionChartsProps> = ({ subscriptions }) => {
  const activeSubs = subscriptions.filter((s) => s.is_active);

  // 1. Monthly spending equivalent per subscription
  const spendingData = activeSubs.map((sub) => {
    const monthlyEquivalent =
      sub.frequency === 'MONTHLY' ? sub.price : sub.price / 12;
    return {
      name: sub.name,
      value: parseFloat(monthlyEquivalent.toFixed(2)),
    };
  });

  // 2. Active vs Inactive count
  const statusData = [
    { name: 'Activas', value: subscriptions.filter((s) => s.is_active).length, color: '#10b981' },
    { name: 'Inactivas', value: subscriptions.filter((s) => !s.is_active).length, color: '#ef4444' },
  ].filter(item => item.value > 0);

  // Colors for charts
  const COLORS = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#14b8a6', // teal
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Chart 1: Monthly Cost Equivalent by Service */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Gasto Mensual Equivalente por Servicio</h3>
        {spendingData.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No hay suscripciones activas para graficar</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.375rem' }}
                  labelStyle={{ color: '#f3f4f6', fontWeight: 'bold' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 2: Spending Distribution */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Distribución del Gasto</h3>
        {spendingData.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No hay suscripciones activas para graficar</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spendingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {spendingData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.375rem' }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Chart 3: Active vs Inactive */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg col-span-1 md:col-span-2 lg:col-span-1">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Estado de los Servicios</h3>
        {statusData.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No hay servicios registrados</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.375rem' }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
