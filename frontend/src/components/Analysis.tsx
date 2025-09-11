'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import SectionHeader from '@/components/SectionHeader';
import InfoTooltip from '@/components/InfoTooltip';

interface PieData { name: string; value: number; }
interface BarData { name: string; [key: string]: string | number; }

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];

export default function Analysis() {
  const { data: session, status } = useSession();
  const [pieData, setPieData] = useState<PieData[]>([]);
  const [barData, setBarData] = useState<BarData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.email) {
      const fetchData = async () => {
        setIsLoading(true);
        try {
          const axiosAuth = axios.create({ headers: { 'Authorization': `Bearer ${session.user?.email}` } });
          const [pieRes, barRes] = await Promise.all([
            axiosAuth.get('https://resi-vn4v.onrender.com/finance/analysis/monthly-distribution'),
            axiosAuth.get('https://resi-vn4v.onrender.com/finance/analysis/spending-trend')
          ]);
          setPieData(pieRes.data);
          setBarData(barRes.data);
        } catch (error) { console.error("Error al cargar datos de análisis:", error); } 
        finally { setIsLoading(false); }
      };
      fetchData();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status, session]);

  if (isLoading) return <p>Cargando análisis...</p>;

  const barKeys = barData.length > 0 ? Object.keys(barData[0]).filter(key => key !== 'name') : [];

  return (
    <div>
      <SectionHeader title="Análisis de Gastos" subtitle="Tus datos hablan. Aquí podés ver visualmente a dónde va tu dinero."/>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-700 p-6 rounded-lg">
          <div className="flex justify-center items-center mb-4">
            <h3 className="text-xl font-semibold text-center">Distribución de Gastos (Mes Actual)</h3>
            <InfoTooltip text="Este gráfico de torta te muestra en qué porciones se dividen tus gastos de este mes." />
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
        <div className="bg-gray-700 p-6 rounded-lg">
          <div className="flex justify-center items-center mb-4">
            <h3 className="text-xl font-semibold text-center">Tendencia de Gastos (Últimos Meses)</h3>
            <InfoTooltip text="Este gráfico compara tus 5 categorías principales a lo largo del tiempo." />
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
          ) : <p className="text-center text-gray-400 mt-16">No hay suficientes datos históricos.</p>}
        </div>
      </div>
    </div>
  );
}