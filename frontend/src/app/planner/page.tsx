'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import InfoTooltip from '@/components/InfoTooltip';
import FloatingActionButton from '@/components/FloatingActionButton';
import Modal from '@/components/Modal';
import AddExpenseForm from '@/components/AddExpenseForm';
import Header from '@/components/Header';
import GamificationModule from '@/components/GamificationModule';
import HeaderToggleButton from '@/components/HeaderToggleButton';
import WalletModule from '@/components/WalletModule'; // <-- Pilar 1: Billetera Resiliente
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/lib/apiClient';

// --- Tipos de Datos ---
interface DashboardData {
    income: number;
    total_spent: number;
    summary: { category: string; allocated: number; spent: number; icon: string }[];
}

export default function PlannerPage() {
    const { data: session, status } = useSession();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isHeaderVisible, setIsHeaderVisible] = useState(false);
    
    const fetchData = useCallback(async () => {
      if (!session?.user?.email) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const dashboardResponse = await apiClient.get<DashboardData>('/finance/dashboard-summary', { 
            headers: { 'Authorization': `Bearer ${session.user.email}` } 
        });
        setDashboardData(dashboardResponse.data);
      } catch (error) {
        console.error("Error al cargar los datos del panel:", error);
        toast.error("Error al cargar los datos del panel.");
      } finally {
        setIsLoading(false);
      }
    }, [session]);
    
    useEffect(() => {
        if (status === 'authenticated') {
            fetchData();
        } else if (status === 'unauthenticated') {
            setIsLoading(false);
        }
    }, [status, session, fetchData, refreshTrigger]);

    const handleExpenseAdded = () => {
        setIsModalOpen(false);
        setRefreshTrigger(prev => prev + 1); // Dispara la recarga de datos
    };

    if (status === 'loading' || (status === 'authenticated' && isLoading)) {
        return <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white"><p>Cargando tu panel de control...</p></main>;
    }
    
    const remaining_total = dashboardData ? dashboardData.income - dashboardData.total_spent : 0;

    return (
      <>
        <HeaderToggleButton isVisible={isHeaderVisible} onToggle={() => setIsHeaderVisible(!isHeaderVisible)} />
        <AnimatePresence>
          {isHeaderVisible && (
            <motion.div
              initial={{ y: '-100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="sticky top-0 z-50"
            >
              <Header refreshTrigger={refreshTrigger} />
            </motion.div>
          )}
        </AnimatePresence>
        <main className={`flex min-h-screen flex-col items-center p-4 md:p-8 bg-gray-900 text-white font-sans transition-all duration-300 ${isHeaderVisible ? 'pt-8' : 'md:pt-16'}`}>
            <h1 className="text-4xl font-bold mb-8 text-center">Panel de Control</h1>

            <div className="w-full max-w-4xl space-y-12">
                
                {/* --- PILAR 1: BILLETERA RESILIENTE (NUEVO) --- */}
                <WalletModule />

                {/* --- Resumen del Mes Financiero (ORIGINAL MEJORADO) --- */}
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-2xl font-bold text-white text-center mb-6">Resumen Financiero del Mes</h3>
                    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-8">
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <div className="flex items-center justify-center">
                                <p className="text-gray-400">Ingreso Mensual</p>
                                <InfoTooltip text="Este es el ingreso total que definiste en tu Planificador." />
                            </div>
                            <p className="text-2xl font-bold text-green-400">${dashboardData?.income.toLocaleString('es-AR') || 0}</p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <div className="flex items-center justify-center">
                                <p className="text-gray-400">Total Gastado</p>
                                <InfoTooltip text="La suma de todos los gastos que has registrado este mes." />
                            </div>
                            <p className="text-2xl font-bold text-red-400">${dashboardData?.total_spent.toLocaleString('es-AR') || 0}</p>
                        </div>
                        <div className="bg-gray-700 p-4 rounded-lg">
                            <div className="flex items-center justify-center">
                                <p className="text-gray-400">Dinero Restante</p>
                                <InfoTooltip text="Tu Ingreso menos lo que ya gastaste. ¡Tu margen para el resto del mes!" />
                            </div>
                            <p className="text-2xl font-bold text-blue-400">${remaining_total.toLocaleString('es-AR')}</p>
                        </div>
                    </div>

                    <h4 className="text-xl font-semibold mb-4">Progreso por Categoría</h4>
                    <div className="space-y-4">
                        {dashboardData?.summary && dashboardData.summary.length > 0 ? dashboardData.summary.map((cat) => {
                            const percentage = cat.allocated > 0 ? (cat.spent / cat.allocated) * 100 : 0;
                            const progressBarColor = percentage > 100 ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500';
                            return (
                                <div key={cat.category} className="space-y-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-semibold">{cat.icon} {cat.category}</span>
                                        <span className="text-sm font-mono">${cat.spent.toLocaleString('es-AR')} / ${cat.allocated.toLocaleString('es-AR')}</span>
                                    </div>
                                    <div className="w-full bg-gray-600 rounded-full h-4">
                                        <div
                                            className={`${progressBarColor} h-4 rounded-full transition-all duration-500`}
                                            style={{ width: `${Math.min(100, percentage)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        }) : <p className="text-center text-gray-400">Aún no has planificado tu presupuesto. ¡Ve a la página principal para empezar!</p>}
                    </div>
                </div>

                {/* --- Gamificación (ORIGINAL) --- */}
                <GamificationModule />
            </div>
        </main>
        
        <div className="fixed bottom-4 right-4 z-50">
            <FloatingActionButton onClick={() => setIsModalOpen(true)} />
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Gasto">
            <AddExpenseForm onExpenseAdded={handleExpenseAdded} />
        </Modal>
      </>
    );
}

