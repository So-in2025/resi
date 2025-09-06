'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import SectionHeader from '@/components/SectionHeader';
import InfoTooltip from '@/components/InfoTooltip';
import Header from '@/components/Header'; // Importar el componente Header

// Tipos de datos para los gráficos
interface PieData {
  name: string;
  value: number;
}
interface BarData {
  name: string; // Mes
  [key: string]: string | number; // Categorías
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943', '#FF6666', '#66FF66', '#6666FF'];

export default function AnalysisPage() {
  const { data: session, status } = useSession();
  const [pieData, setPieData] = useState<PieData[]>([]);
  const [barData, setBarData] = useState<BarData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!session?.user?.email) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const axiosAuth = axios.create({ 
          headers: { 'Authorization': `Bearer ${session.user.email}` }
        });
        const [pieRes, barRes] = await Promise.all([
          axiosAuth.get('http://localhost:8000/analysis/monthly-distribution'),
          axiosAuth.get('http://localhost:8000/analysis/spending-trend')
        ]);
        setPieData(pieRes.data);
        setBarData(barRes.data);
      } catch (error) { 
        console.error("Error al cargar datos de análisis:", error); 
      } finally { 
        setIsLoading(false); 
      }
    };

    if (status === 'authenticated') {
      fetchData();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, session]);

  if (status === "loading" || isLoading) {
    return <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white"><p>Cargando análisis...</p></main>;
  }

  if (status === "unauthenticated") {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white text-center">
            <h2 className="text-2xl mb-4">Acceso Denegado</h2>
            <p className="mb-6">Debes iniciar sesión para ver tus análisis.</p>
            <button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">
                Ingresar con Google
            </button>
        </main>
    );
  }

  const barKeys = barData.length > 0 ? Object.keys(barData[0]).filter(key => key !== 'name') : [];

  return (
    <>
      <Header /> {/* Renderizar el Header aquí */}
      <main className="flex min-h-screen flex-col items-center p-8 bg-gray-900 text-white font-sans">
        <Link href="/" className="absolute top-4 left-4 text-green-400 hover:text-green-300">&larr; Volver al Dashboard</Link>
        <SectionHeader title="Análisis de Gastos" subtitle="Tus datos hablan. Aquí podés ver visualmente a dónde va tu dinero."/>

        <div className="mt-8 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex justify-center items-center mb-4">
              <h3 className="text-xl font-semibold text-center">Distribución de Gastos (Mes Actual)</h3>
              <InfoTooltip text="Este gráfico de torta te muestra en qué porciones se dividen tus gastos de este mes. Te ayuda a ver al toque cuál es tu categoría más importante." />
            </div>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={150} fill="#8884d8" label>
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-gray-400 mt-16">No hay gastos registrados este mes.</p>}
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex justify-center items-center mb-4">
              <h3 className="text-xl font-semibold text-center">Tendencia de Gastos (Últimos Meses)</h3>
              <InfoTooltip text="Este gráfico de barras compara tus 5 categorías principales a lo largo del tiempo. Es ideal para ver si estás logrando reducir un gasto mes a mes." />
            </div>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                      <XAxis dataKey="name" stroke="#A0AEC0" />
                      <YAxis stroke="#A0AEC0" tickFormatter={(value: number) => `$${value/1000}k`} />
                      <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} cursor={{fill: '#2D3748'}} />
                      <Legend />
                      {barKeys.map((key, index) => (
                          <Bar key={key} dataKey={key} fill={COLORS[index % COLORS.length]} />
                      ))}
                  </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-gray-400 mt-16">No hay suficientes datos históricos para mostrar una tendencia.</p>}
          </div>
        </div>
      </main>
    </>
  );
}