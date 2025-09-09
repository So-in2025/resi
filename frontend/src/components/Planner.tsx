// En: frontend/src/components/Planner.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { FaPlus, FaSave, FaTrashAlt } from 'react-icons/fa';
import SectionHeader from './SectionHeader';

interface BudgetItem {
    category: string;
    allocated_amount: number;
    icon?: string;
    is_custom: boolean;
}
interface PlannerProps {
  budgetData: {
    income: number;
    items: BudgetItem[];
  } | null;
  onBudgetUpdate: () => void;
}

const defaultCategories: Omit<BudgetItem, 'allocated_amount'>[] = [
    { category: 'Vivienda', icon: '🏠', is_custom: false },
    { category: 'Servicios Básicos', icon: '💡', is_custom: false },
    { category: 'Supermercado', icon: '🛒', is_custom: false },
    { category: 'Kioscos', icon: '🍫', is_custom: false },
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

const StepperButton = ({ amount, onUpdate }: { amount: number, onUpdate: (amount: number) => void }) => {
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleInitialPress = () => {
        onUpdate(amount);
        timerRef.current = setTimeout(() => {
            let step = amount > 0 ? 100 : -100;
            intervalRef.current = setInterval(() => {
                onUpdate(step);
                if (Math.abs(step) < 1000) { step = amount > 0 ? 1000 : -1000; } 
                else { step = amount > 0 ? 10000 : -10000; }
            }, 100);
        }, 300);
    };

    const handleStopPress = () => {
        if (timerRef.current) { clearTimeout(timerRef.current); }
        if (intervalRef.current) { clearInterval(intervalRef.current); }
    };

    return (
        <button onMouseDown={handleInitialPress} onMouseUp={handleStopPress} onMouseLeave={handleStopPress} onTouchStart={handleInitialPress} onTouchEnd={handleStopPress}
            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-full font-bold text-2xl md:text-3xl transition-colors select-none">
            {amount > 0 ? '+' : '-'}
        </button>
    );
};

export default function Planner({ budgetData, onBudgetUpdate }: PlannerProps) {
    const { data: session } = useSession();
    const [income, setIncome] = useState<number>(0);
    const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
    const [newCategory, setNewCategory] = useState('');
    
    useEffect(() => {
        if (budgetData) {
            setIncome(budgetData.income);
            const savedItemsMap = new Map(budgetData.items.map(item => [item.category, item]));
            const allCategoryNames = new Set([...defaultCategories.map(c => c.category), ...budgetData.items.map(c => c.category)]);
            const fullBudgetList = Array.from(allCategoryNames).map(categoryName => {
                const savedItem = savedItemsMap.get(categoryName);
                const defaultItem = defaultCategories.find(c => c.category === categoryName);
                return {
                    category: categoryName,
                    allocated_amount: savedItem ? savedItem.allocated_amount : 0,
                    icon: defaultItem?.icon || '💸',
                    is_custom: savedItem ? savedItem.is_custom : (defaultItem ? defaultItem.is_custom : true),
                };
            });
            setBudgetItems(fullBudgetList);
        } else {
            setBudgetItems(defaultCategories.map(cat => ({ ...cat, allocated_amount: 0 })));
        }
    }, [budgetData]);

    const handleUpdateAmount = (category: string, increment: number) => {
        setBudgetItems(prevItems => prevItems.map(item => 
            item.category === category ? { ...item, allocated_amount: Math.max(0, item.allocated_amount + increment) } : item
        ));
    };

    const handleManualChange = (category: string, value: string) => {
        const newAmount = value === '' ? 0 : parseFloat(value);
        setBudgetItems(prevItems => prevItems.map(item => 
            item.category === category ? { ...item, allocated_amount: isNaN(newAmount) ? 0 : newAmount } : item
        ));
    };

    const handleAddCategory = () => {
        const capitalizedCategory = newCategory.trim().charAt(0).toUpperCase() + newCategory.trim().slice(1);
        if (capitalizedCategory && !budgetItems.some(item => item.category.toLowerCase() === capitalizedCategory.toLowerCase())) {
            setBudgetItems([...budgetItems, { category: capitalizedCategory, allocated_amount: 0, is_custom: true, icon: '💸' }]);
            setNewCategory('');
        }
    };

    const handleDeleteCategory = (category: string) => {
        setBudgetItems(prevItems => prevItems.filter(item => item.category !== category));
    };

    const handleSaveBudget = async () => {
        if (!session?.user?.email) {
            toast.error("Debes iniciar sesión para guardar el plan.");
            return;
        }
        const toastId = toast.loading("Guardando planificación...");
        try {
            await axios.post('https://resi-vn4v.onrender.com/finance/budget',
                { income, items: budgetItems },
                { headers: { 'Authorization': `Bearer ${session.user.email}` } }
            );
            toast.success("¡Planificación guardada con éxito!", { id: toastId });
            onBudgetUpdate();
        } catch (error) {
            toast.error('Error al guardar la planificación.', { id: toastId });
            console.error("Error al guardar la planificación:", error);
        }
    };
    
    return (
      <div className="w-full">
        <SectionHeader title="Planificador de Presupuesto" subtitle="Acá le decís a tu dinero a dónde ir. Un buen plan es el primer paso." />
        <div className="w-full bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-700 pb-4 mb-4 gap-4">
                <span className="font-semibold text-xl text-white">Ingresos del mes:</span>
                <div className="flex items-center gap-2">
                    <StepperButton amount={-10000} onUpdate={(amount) => setIncome(prev => Math.max(0, prev + amount))} />
                    <span className="text-2xl font-mono text-green-400">$</span>
                    <input type="number" value={income || ''} onChange={(e) => setIncome(Number(e.target.value))} className="w-36 md:w-48 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-2xl text-right font-mono text-green-400"/>
                    <StepperButton amount={10000} onUpdate={(amount) => setIncome(prev => Math.max(0, prev + amount))} />
                </div>
            </div>
            <div className="flex justify-between items-center">
                <span className="font-semibold text-xl text-white">Total Asignado:</span>
                <p className="text-2xl font-bold text-yellow-400">${budgetItems.reduce((sum, item) => sum + item.allocated_amount, 0).toLocaleString('es-AR')}</p>
            </div>
        </div>
        <div className="w-full space-y-4 bg-gray-800 rounded-lg shadow-lg p-6">
            {budgetItems.map(item => (
                <div key={item.category} className="flex flex-col md:flex-row md:items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                    <div className="flex items-center gap-3 mb-2 md:mb-0">
                        <span className="text-2xl">{item.icon}</span>
                        <span className="font-semibold text-lg text-white">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <StepperButton amount={-1000} onUpdate={(amount) => handleUpdateAmount(item.category, amount)} />
                        <span className="text-lg font-mono text-gray-400">$</span>
                        <input type="number" value={item.allocated_amount || ''} onChange={(e) => handleManualChange(item.category, e.target.value)} className="text-lg w-28 text-center font-mono bg-gray-700 rounded-lg p-2"/>
                        <StepperButton amount={1000} onUpdate={(amount) => handleUpdateAmount(item.category, amount)} />
                        {item.is_custom && (<button onClick={() => handleDeleteCategory(item.category)} className="text-red-500 hover:text-red-400 text-xl font-bold ml-2 p-2"><FaTrashAlt/></button>)}
                    </div>
                </div>
            ))}
        </div>
        <div className="mt-8 w-full flex items-center gap-4 p-4 bg-gray-800 rounded-lg">
            <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nombre de nueva categoría" className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg" />
            <button onClick={handleAddCategory} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold whitespace-nowrap flex items-center gap-2"><FaPlus/> Agregar</button>
        </div>
        <div className="mt-8 flex justify-center">
             <button onClick={handleSaveBudget} className="px-8 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-bold transition-colors flex items-center justify-center gap-2 w-full md:w-auto"><FaSave/> Guardar Planificación</button>
        </div>
      </div>
    );
}