'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import InfoTooltip from '@/components/InfoTooltip';
import FloatingActionButton from '@/components/FloatingActionButton';
import Modal from '@/components/Modal';
import AddExpenseForm from '@/components/AddExpenseForm';
import Header from '@/components/Header';
import SectionHeader from '@/components/SectionHeader';
import { FaPlus, FaSave } from 'react-icons/fa';
import apiClient from '@/lib/apiClient'; // IMPORTANTE: Usar apiClient

// Tipos de datos
interface BudgetItem {
    category: string;
    allocated_amount: number;
    icon?: string;
    is_custom: boolean;
}
interface DashboardData {
    income: number;
    total_spent: number;
    summary: { category: string; allocated: number; spent: number; icon: string }[];
}
interface BudgetResponse {
    income: number;
    items: BudgetItem[];
}

// TU LISTA DE CATEGORÍAS
const defaultCategories: Omit<BudgetItem, 'allocated_amount'>[] = [
    { category: 'Vivienda', icon: '🏠', is_custom: false },
    { category: 'Servicios Básicos', icon: '💡', is_custom: false },
    { category: 'Supermercado', icon: '🛒', is_custom: false },
    { category: 'Transporte', icon: '🚗', is_custom: false },
    { category: 'Salud', icon: '⚕️', is_custom: false },
    { category: 'Deudas', icon: '💳', is_custom: false },
    { category: 'Préstamos', icon: '🏦', is_custom: false },
    { category: 'Entretenimiento', icon: '🎬', is_custom: false },
    { category: 'Hijos', icon: '🧑‍🍼', is_custom: false },
    { category: 'Mascotas', icon: '🐾', is_custom: false },
    { category: 'Cuidado Personal', icon: '🧴', is_custom: false },
    { category: 'Vestimenta', icon: '👕', is_custom: false },
    { category: 'Ahorro', icon: '💰', is_custom: false },
    { category: 'Inversión', icon: '📈', is_custom: false },
];

export default function PlannerPage() {
    const { data: session, status } = useSession();
    const [income, setIncome] = useState<number>(0);
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [newCategory, setNewCategory] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshHeader, setRefreshHeader] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const fetchData = async () => {
      if (!session?.user?.email) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const apiHeaders = { headers: { 'Authorization': `Bearer ${session.user.email}` } };
        const [budgetResponse, dashboardResponse] = await Promise.all([
          apiClient.get<BudgetResponse>('/finance/budget', apiHeaders),
          apiClient.get<DashboardData>('/finance/dashboard-summary', apiHeaders),
        ]);
        
        const savedData = budgetResponse.data;
        const dashData = dashboardResponse.data;
        
        setIncome(savedData.income || 0);

        const fetchedCategories = savedData.items;
        const mergedCategories = defaultCategories.map(defaultCat => {
            const existing = fetchedCategories.find(item => item.category === defaultCat.category);
            return existing ? { ...existing, icon: defaultCat.icon } : { ...defaultCat, allocated_amount: 0, is_custom: false };
        });
        const customCategories = fetchedCategories.filter(item => item.is_custom);
        setBudgetItems([...mergedCategories, ...customCategories]);
        
        setDashboardData(dashData);
      } catch (error) {
        console.error("Error al cargar los datos:", error);
        toast.error("Error al cargar los datos.");
      } finally {
        setIsLoading(false);
      }
    };
    
    useEffect(() => {
        if (status === 'authenticated') {
            fetchData();
        }
    }, [status, session]);

    const handleUpdateAmount = (category: string, increment: number) => {
        setBudgetItems(prevItems => prevItems.map((item: BudgetItem) => {
            if (item.category === category) {
                return { ...item, allocated_amount: Math.max(0, item.allocated_amount + increment) };
            }
            return item;
        }));
    };

    const handleManualChange = (category: string, value: string) => {
        const newAmount = value === '' ? 0 : parseFloat(value);
        setBudgetItems(prevItems => prevItems.map((item: BudgetItem) => {
            if (item.category === category) {
                return { ...item, allocated_amount: isNaN(newAmount) ? 0 : newAmount };
            }
            return item;
        }));
    };

    const handleAddCategory = () => {
        const capitalizedCategory = newCategory.trim().charAt(0).toUpperCase() + newCategory.trim().slice(1);
        if (capitalizedCategory && !budgetItems.some(item => item.category.toLowerCase() === capitalizedCategory.toLowerCase())) {
            setBudgetItems([...budgetItems, { category: capitalizedCategory, allocated_amount: 0, is_custom: true, icon: '💸' }]);
            setNewCategory('');
        }
    };

    const handleDeleteCategory = (category: string) => {
        setBudgetItems(prevItems => prevItems.filter((item: BudgetItem) => item.category !== category));
    };

    const handleSaveBudget = async () => {
        if (!session?.user?.email) {
            toast.error("Debes iniciar sesión para guardar el plan.");
            return;
        }

        const toastId = toast.loading("Guardando planificacion...");
        try {
            await apiClient.post('/finance/budget',
                { income, items: budgetItems },
                { headers: { 'Authorization': `Bearer ${session.user?.email}` } }
            );
            toast.success("Planificacion guardada con éxito!", { id: toastId });
            fetchData();
            setRefreshHeader(prev => prev + 1);
        } catch (error) {
            toast.error('Error al guardar la planificacion.', { id: toastId });
            console.error("Error al guardar la planificacion:", error);
        }
    };

    const startUpdating = (category: string | 'income', increment: number) => {
        const updateFunction = category === 'income' ? () => setIncome((prev: number) => Math.max(0, prev + increment)) : () => handleUpdateAmount(category as string, increment);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        updateFunction();

        timeoutRef.current = setTimeout(() => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(updateFunction, 100);
        }, 300);
    };

    const stopUpdating = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
    };

    const handleExpenseAdded = () => {
        setIsModalOpen(false);
        fetchData();
        setRefreshHeader(prev => prev + 1);
    };

    const totalAllocated = budgetItems.reduce((sum, item) => sum + item.allocated_amount, 0);
    const remaining_total = dashboardData ? dashboardData.income - dashboardData.total_spent : 0;

    if (status === 'loading' || isLoading) return <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white"><p>Cargando...</p></main>;
    
    return (
      <>
        <Header refreshTrigger={refreshHeader} />
        <main className="flex min-h-screen flex-col items-center p-8 bg-gray-900 text-white font-sans md:pt-16">
            <h1 className="text-4xl font-bold mb-8 text-center">Resumen del Mes</h1>

            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-center">
                        <p className="text-gray-400">Ingreso Mensual</p>
                        <InfoTooltip text="Este es el ingreso total que definiste en tu Planificador." />
                    </div>
                    <p className="text-2xl font-bold text-green-400">${dashboardData?.income.toLocaleString()}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-center">
                        <p className="text-gray-400">Total Gastado</p>
                        <InfoTooltip text="La suma de todos los gastos que has registrado este mes." />
                    </div>
                    <p className="text-2xl font-bold text-red-400">${dashboardData?.total_spent.toLocaleString()}</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                    <div className="flex items-center justify-center">
                        <p className="text-gray-400">Dinero Restante</p>
                        <InfoTooltip text="Tu Ingreso menos lo que ya gastaste. ¡Tu margen para el resto del mes!" />
                    </div>
                    <p className="text-2xl font-bold text-blue-400">${remaining_total.toLocaleString()}</p>
                </div>
            </div>

            <div className="mt-8 w-full max-w-4xl bg-gray-700 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Progreso por Categoría</h3>
                <div className="space-y-4">
                    {dashboardData?.summary.map((cat) => {
                        const allocatedAmount = budgetItems.find(item => item.category === cat.category)?.allocated_amount || 0;
                        const percentage = allocatedAmount > 0 ? (cat.spent / allocatedAmount) * 100 : 0;
                        const progressBarColor = percentage > 100 ? 'bg-red-500' : 'bg-green-500';
                        return (
                            <div key={cat.category} className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold">{cat.icon} {cat.category}</span>
                                    <span className="text-sm font-mono">${cat.spent.toLocaleString()} / ${allocatedAmount.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-600 rounded-full h-4">
                                    <div
                                        className={`${progressBarColor} h-4 rounded-full`}
                                        style={{ width: `${Math.min(100, percentage)}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
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