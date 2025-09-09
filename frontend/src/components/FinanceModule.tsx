// En: frontend/src/components/FinanceModule.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Planner from './Planner';
import SavingGoals from './SavingGoals';
import History from './History';
import Analysis from './Analysis';
import { FaMoneyBillWave, FaBullseye, FaHistory, FaChartLine, FaSync, FaExclamationCircle, FaRobot } from 'react-icons/fa';
import { useSession, signIn } from 'next-auth/react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';

// --- COMPONENTES INTERNOS Y TIPOS (SIN CAMBIOS) ---
interface TabButtonProps {
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon: React.ElementType;
}

const TabButton = ({ isActive, onClick, children, icon: Icon }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`md:flex-1 flex items-center justify-center md:justify-start gap-2 px-4 py-3 font-semibold rounded-t-lg transition-colors text-sm md:text-base ${
      isActive ? 'bg-gray-700 text-green-400 border-b-2 border-green-400' : 'bg-gray-800 text-gray-400 hover:bg-gray-700/50'
    }`}
  >
    <Icon className="h-5 w-5" />
    <span className="hidden md:inline">{children}</span>
  </button>
);

interface ResilienceSummaryProps {
    summary: {
        title: string;
        message: string;
        suggestion: string;
    };
}

const ResilienceSummary = ({ summary }: ResilienceSummaryProps) => (
    <div className="bg-gray-700 p-6 rounded-lg mb-6 border-l-4 border-green-400">
        <h3 className="text-xl font-bold text-white flex items-center gap-2"><FaRobot /> Diagnóstico de Resi: <span className="text-green-400">{summary.title}</span></h3>
        <p className="text-gray-300 mt-2">{summary.message}</p>
        <p className="text-gray-400 italic mt-3 text-sm">{summary.suggestion}</p>
    </div>
);

export interface FinancialData {
  resilienceSummary: {
    title: string;
    message: string;
    suggestion: string;
    supermarket_spending: number;
  };
  budget: any;
  expenses: any[];
  goals: any[];
}

// CORRECCIÓN BUCLE: Añadimos la prop 'isOpen' para saber cuándo cargar los datos.
interface FinanceModuleProps {
    onDataLoaded: (data: { supermarketSpending: number }) => void;
    isOpen: boolean; 
}

// --- COMPONENTE PRINCIPAL ---
export default function FinanceModule({ onDataLoaded, isOpen }: FinanceModuleProps) {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('planificador');
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.email) {
      if(status !== 'loading') setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const apiHeaders = { headers: { 'Authorization': `Bearer ${session.user.email}` } };
      const [summaryRes, budgetRes, expensesRes, goalsRes] = await Promise.all([
        apiClient.get('/finance/analysis/resilience-summary', apiHeaders),
        apiClient.get('/finance/budget', apiHeaders),
        apiClient.get('/finance/expenses', apiHeaders),
        apiClient.get('/finance/goals', apiHeaders),
      ]);
      const allData: FinancialData = {
        resilienceSummary: summaryRes.data,
        budget: budgetRes.data,
        expenses: expensesRes.data,
        goals: goalsRes.data,
      };
      setFinancialData(allData);
      onDataLoaded({ supermarketSpending: summaryRes.data.supermarket_spending });
    } catch (err) {
      console.error("Error al buscar datos financieros:", err);
      setError("No se pudieron cargar tus datos. Por favor, recargá la página.");
      toast.error("Hubo un problema al cargar tu información financiera.");
    } finally {
      setIsLoading(false);
    }
  // CORRECCIÓN BUCLE: Se elimina 'onDataLoaded' de las dependencias para romper el bucle.
  }, [session, status]);

  useEffect(() => {
    // CORRECCIÓN BUCLE: Solo se ejecuta la carga de datos si el acordeón está abierto.
    if (status === 'authenticated' && isOpen) {
        fetchAllData();
    }
  // CORRECCIÓN BUCLE: Ahora la dependencia principal es 'isOpen'.
  }, [status, isOpen, fetchAllData]);

  // Si el usuario no está logueado, se muestra el mensaje para ingresar.
  if (status === 'unauthenticated') {
    return (
        <div className="text-center p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Este es tu Centro de Comando Financiero</h3>
            <p className="text-gray-300 mb-6">Iniciá sesión para planificar tu presupuesto, crear metas de ahorro y recibir análisis de la IA para tomar el control de tu plata.</p>
            <button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">
                Ingresar para empezar
            </button>
        </div>
    );
  }

  // Muestra el mensaje de carga solo si el acordeón está abierto y los datos aún no están listos.
  if (isLoading && isOpen) {
    return <div className="flex items-center justify-center h-64"><FaSync className="animate-spin text-4xl text-gray-400" /><p className="ml-4 text-gray-400">Analizando tus finanzas...</p></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-400"><FaExclamationCircle className="text-4xl" /><p className="ml-4">{error}</p></div>;
  }
  
  // Si no está cargando y no hay datos (porque el acordeón no se abrió), no muestra nada.
  if (!financialData) {
    return null; 
  }

  return (
    <div className="w-full bg-gray-800 rounded-lg p-2 md:p-4">
      {financialData.resilienceSummary && <ResilienceSummary summary={financialData.resilienceSummary} />}
      <div className="flex flex-wrap border-b border-gray-700">
        <TabButton isActive={activeTab === 'planificador'} onClick={() => setActiveTab('planificador')} icon={FaMoneyBillWave}>Planificador</TabButton>
        <TabButton isActive={activeTab === 'metas'} onClick={() => setActiveTab('metas')} icon={FaBullseye}>Metas de Ahorro</TabButton>
        <TabButton isActive={activeTab === 'historial'} onClick={() => setActiveTab('historial')} icon={FaHistory}>Historial</TabButton>
        <TabButton isActive={activeTab === 'analisis'} onClick={() => setActiveTab('analisis')} icon={FaChartLine}>Análisis</TabButton>
      </div>
      <div className="mt-4 md:mt-6 p-2">
        {activeTab === 'planificador' && <Planner budgetData={financialData.budget} onBudgetUpdate={fetchAllData} />}
        {activeTab === 'metas' && <SavingGoals goalsData={financialData.goals || []} onGoalUpdate={fetchAllData} />}
        {activeTab === 'historial' && <History expensesData={financialData.expenses || []} onExpenseUpdate={fetchAllData} />}
        {activeTab === 'analisis' && <Analysis />}
      </div>
    </div>
  );
}

