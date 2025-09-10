'use client';
import { useState } from 'react';
import { FaTrashAlt, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';

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

export default function History({ expensesData, onExpenseUpdate }: HistoryProps) {
    const { data: session } = useSession();
    const [sortConfig, setSortConfig] = useState<{ key: keyof Expense; direction: 'ascending' | 'descending' } | null>(null);

    const handleDelete = async (id: number) => {
        if (!session) {
            toast.error("Debes iniciar sesión para borrar un gasto.");
            return;
        }
        if (confirm("¿Estás seguro de que querés borrar este gasto?")) {
            const toastId = toast.loading("Borrando gasto...");
            try {
                await apiClient.delete(`/finance/expenses/${id}`, {
                    headers: { 'Authorization': `Bearer ${session.user?.email}` }
                });
                toast.success("Gasto borrado con éxito.", { id: toastId });
                onExpenseUpdate();
            } catch (error) {
                console.error("Error al borrar el gasto:", error);
                toast.error("No se pudo borrar el gasto.", { id: toastId });
            }
        }
    };

    const sortedExpenses = [...expensesData];
    if (sortConfig !== null) {
        sortedExpenses.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    const requestSort = (key: keyof Expense) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: keyof Expense) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <FaSort className="inline-block ml-1 text-gray-500" />;
        }
        return sortConfig.direction === 'ascending' ? <FaSortUp className="inline-block ml-1" /> : <FaSortDown className="inline-block ml-1" />;
    };

    if (expensesData.length === 0) {
        return <p className="text-center text-gray-400 py-8">Todavía no registraste ningún gasto este mes.</p>;
    }

    return (
        // El overflow-x-auto se mantiene como una buena práctica de contención
        <div className="overflow-x-auto bg-gray-700 p-4 rounded-lg">
            <table className="w-full text-left table-fixed"> {/* Usamos table-fixed para un mejor control */}
                <thead>
                    <tr className="border-b border-gray-600">
                        <th className="p-3 w-2/5 cursor-pointer" onClick={() => requestSort('description')}>Descripción {getSortIcon('description')}</th>
                        <th className="p-3 w-1/5 cursor-pointer" onClick={() => requestSort('category')}>Categoría {getSortIcon('category')}</th>
                        <th className="p-3 w-1/5 text-right cursor-pointer" onClick={() => requestSort('amount')}>Monto {getSortIcon('amount')}</th>
                        <th className="p-3 w-1/5 text-right cursor-pointer" onClick={() => requestSort('date')}>Fecha {getSortIcon('date')}</th>
                        <th className="p-3 w-[5%]"></th>
                    </tr>
                </thead>
                <tbody>
                    {sortedExpenses.map((expense) => (
                        <tr key={expense.id} className="border-b border-gray-800 hover:bg-gray-600/50">
                            {/* CAMBIO: Se elimina `whitespace-nowrap` y se añade `break-words` para permitir que el texto se divida */}
                            <td className="p-3 break-words">{expense.description}</td>
                            <td className="p-3 break-words">{expense.category}</td>
                            {/* Mantenemos nowrap para números y fechas que son cortos y no deben partirse */}
                            <td className="p-3 text-right whitespace-nowrap font-mono">${expense.amount.toLocaleString('es-AR')}</td>
                            <td className="p-3 text-right whitespace-nowrap">{new Date(expense.date).toLocaleDateString('es-AR')}</td>
                            <td className="p-3 text-right">
                                <button onClick={() => handleDelete(expense.id)} className="text-red-500 hover:text-red-400"><FaTrashAlt /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}