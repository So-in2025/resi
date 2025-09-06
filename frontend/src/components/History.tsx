// En: frontend/src/components/History.tsx
'use client';
import { useState, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';
import SectionHeader from './SectionHeader';

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
}
interface HistoryProps {
    expensesData: Expense[];
    onExpenseUpdate: () => void;
}

export default function History({ expensesData }: HistoryProps) {
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const uniqueCategories = [...new Set(expensesData.map((exp: Expense) => exp.category))] as string[];
    setCategories(uniqueCategories);
    let result = expensesData;
    if (searchTerm) {
        result = result.filter(expense => 
            expense.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    if (categoryFilter !== 'all') {
        result = result.filter(expense => expense.category === categoryFilter);
    }
    setFilteredExpenses(result);
  }, [searchTerm, categoryFilter, expensesData]);

  return (
    <div>
        <SectionHeader title="Historial de Gastos" subtitle="Tu memoria financiera. Buscá y filtrá para encontrar cualquier movimiento." />
        <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-gray-800 rounded-lg">
            <div className="relative flex-grow">
                <input 
                    type="text" 
                    placeholder="Buscar en descripciones..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900/50 p-3 pl-10 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
                />
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            </div>
            <select 
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-gray-900/50 p-3 rounded-lg border border-gray-600 focus:ring-green-500 focus:border-green-500"
            >
                <option value="all">Todas las categorías</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
        </div>
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left table-auto">
              <thead >
                <tr className="border-b border-gray-700 bg-gray-900/50 text-sm text-gray-300">
                  <th className="p-4 font-semibold">Fecha</th>
                  <th className="p-4 font-semibold">Descripción</th>
                  <th className="p-4 font-semibold">Categoría</th>
                  <th className="p-4 font-semibold text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {expensesData.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-gray-400 py-10">Aún no has registrado ningún gasto este mes.</td></tr>
                ) : filteredExpenses.length === 0 ? (
                    <tr><td colSpan={4} className="text-center text-gray-400 py-10">No se encontraron gastos con esos filtros.</td></tr>
                ) : (
                    filteredExpenses.map(expense => (
                      <tr key={expense.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                        <td className="p-4 whitespace-nowrap text-gray-400">{new Date(expense.date).toLocaleDateString('es-AR')}</td>
                        <td className="p-4 text-white">{expense.description}</td>
                        <td className="p-4 capitalize text-gray-300">{expense.category}</td>
                        <td className="p-4 text-right font-mono text-red-400 whitespace-nowrap">${expense.amount.toLocaleString('es-AR')}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}