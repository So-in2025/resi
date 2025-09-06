'use client';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { FaPlus, FaBullseye, FaLightbulb } from 'react-icons/fa';
import toast from 'react-hot-toast';
import SectionHeader from './SectionHeader';

interface Goal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
}
interface Projection {
  months_remaining: number;
  suggestion: string;
}
interface SavingGoalsProps {
    goalsData: Goal[];
    onGoalUpdate: () => void;
}

export default function SavingGoals({ goalsData, onGoalUpdate }: SavingGoalsProps) {
    const { data: session } = useSession();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [newGoalName, setNewGoalName] = useState('');
    const [newGoalAmount, setNewGoalAmount] = useState<number | ''>('');
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [projection, setProjection] = useState<Projection | null>(null);

    const handleSelectGoal = useCallback(async (goal: Goal) => {
        if (!session?.user?.email) return;
        setSelectedGoal(goal);
        setProjection(null);
        const toastId = toast.loading("Calculando proyección de Resi...");
        try {
            const response = await axios.get<Projection>(`http://localhost:8000/goals/projection/${goal.id}`, {
                headers: { 'Authorization': `Bearer ${session.user.email}` }
            });
            setProjection(response.data);
            toast.dismiss(toastId);
        } catch (error) {
            toast.error("No se pudo calcular la proyección.", { id: toastId });
            console.error("Error al obtener la proyección:", error);
        }
    }, [session]);

    useEffect(() => {
        setGoals(goalsData);
        if (goalsData.length > 0 && (!selectedGoal || !goalsData.find(g => g.id === selectedGoal.id))) {
            handleSelectGoal(goalsData[0]);
        } else if (goalsData.length === 0) {
            setSelectedGoal(null);
            setProjection(null);
        }
    }, [goalsData, selectedGoal, handleSelectGoal]);

    const handleCreateGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoalName || !newGoalAmount || !session?.user?.email) return;
        const toastId = toast.loading("Creando meta...");
        try {
            await axios.post('http://localhost:8000/goals', 
                { name: newGoalName, target_amount: newGoalAmount },
                { headers: { 'Authorization': `Bearer ${session.user.email}` } }
            );
            toast.success("¡Meta creada con éxito!", { id: toastId });
            setNewGoalName('');
            setNewGoalAmount('');
            onGoalUpdate();
        } catch (error) {
            toast.error("Error al crear la meta.", { id: toastId });
        }
    };
    
    return (
        <div>
            <SectionHeader title="Metas de Ahorro" subtitle="Ponerle nombre a tus ahorros es el mejor motivador. ¡Creá tu primera meta!" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-gray-800 p-4 rounded-lg">
                    <h3 className="font-bold mb-4 text-lg text-white">Crear / Seleccionar</h3>
                    <form onSubmit={handleCreateGoal} className="space-y-3 mb-4">
                        <input type="text" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} placeholder="Nombre (Ej: Vacaciones)" className="w-full bg-gray-900/50 p-2 rounded-md border border-gray-600"/>
                        <input type="number" value={newGoalAmount === 0 ? '' : newGoalAmount} onChange={e => setNewGoalAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Monto Objetivo ($)" className="w-full bg-gray-900/50 p-2 rounded-md border border-gray-600"/>
                        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 p-2 rounded-md flex items-center justify-center gap-2 font-semibold"><FaPlus/> Crear Meta</button>
                    </form>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {goals.length > 0 ? goals.map(goal => (
                            <button key={goal.id} onClick={() => handleSelectGoal(goal)} className={`w-full text-left p-3 rounded-md transition-colors ${selectedGoal?.id === goal.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-900 hover:bg-gray-700'}`}>
                                {goal.name}
                            </button>
                        )) : <p className="text-sm text-gray-400 text-center py-4">Aún no creaste ninguna meta.</p>}
                    </div>
                </div>
                <div className="md:col-span-2 bg-gray-800 p-6 rounded-lg min-h-[300px] flex flex-col justify-center">
                    {selectedGoal ? (
                        <div className="text-center">
                            <h3 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2 text-white"><FaBullseye /> {selectedGoal.name}</h3>
                            <p className="text-4xl font-mono mb-2 text-white">${selectedGoal.current_amount.toLocaleString('es-AR')} / <span className="text-green-400">${selectedGoal.target_amount.toLocaleString('es-AR')}</span></p>
                            <div className="w-full bg-gray-600 rounded-full h-4 mb-4 overflow-hidden">
                                <div className="bg-green-500 h-4 rounded-full" style={{width: `${(selectedGoal.current_amount / selectedGoal.target_amount) * 100}%`}}></div>
                            </div>
                            {projection && (
                                <div className="mt-6 bg-gray-900 p-4 rounded-lg border-l-4 border-green-400">
                                    <h4 className="font-bold flex items-center gap-2 text-left text-white"><FaLightbulb className="text-yellow-400"/> Resi te aconseja:</h4>
                                    <p className="italic mt-2 text-left text-gray-300">{projection.suggestion}</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-400">Creá o seleccioná una meta para ver tu progreso.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}