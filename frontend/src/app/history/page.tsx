// En: frontend/src/app/history/page.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Header from '@/components/Header'; // Importar el componente Header
import { useSession } from 'next-auth/react';

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Asegurarse de que el usuario está autenticado antes de hacer la llamada
    if (status === 'authenticated' && session?.user?.email) {
      axios.get('http://localhost:8000/expenses', {
        headers: { 'Authorization': `Bearer ${session.user.email}` }
      })
      .then(response => {
        setExpenses(response.data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error("Error al cargar el historial:", error);
        setIsLoading(false);
      });
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, session]);

  return (
    <>
      <Header /> {/* Renderizar el Header aquí */}
      <main className="flex min-h-screen flex-col items-center p-8 bg-gray-900 text-white font-sans">
        <Link href="/" className="absolute top-4 left-4 text-green-400 hover:text-green-300">&larr; Volver al Dashboard</Link>
        <h1 className="text-4xl font-bold">Historial de Gastos</h1>

        <div className="mt-8 w-full max-w-4xl">
          {isLoading ? (
            <p>Cargando historial...</p>
          ) : expenses.length === 0 ? (
            <p className="text-center text-gray-400">Aún no has registrado ningún gasto.</p>
          ) : (
            <div className="bg-gray-800 rounded-lg shadow-lg">
              <table className="w-full text-left table-auto">
                <thead >
                  <tr className="border-b border-gray-700">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Descripción</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(expense => (
                    <tr key={expense.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="p-4">{new Date(expense.date).toLocaleDateString('es-AR')}</td>
                      <td className="p-4">{expense.description}</td>
                      <td className="p-4 capitalize">{expense.category}</td>
                      <td className="p-4 text-right font-mono text-red-400">${expense.amount.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}