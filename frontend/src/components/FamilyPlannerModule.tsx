// En: frontend/src/components/FamilyPlannerModule.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { FaUsers, FaAppleAlt, FaPiggyBank, FaGamepad, FaArrowLeft, FaArrowRight, FaRobot, FaMicrochip, FaUserPlus, FaTrashAlt, FaUtensils } from 'react-icons/fa';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';

const StepIndicator = ({ currentStep, totalSteps }: { currentStep: number, totalSteps: number }) => (
  <div className="flex justify-center items-center mb-8">
    {Array.from({ length: totalSteps }, (_, i) => (
      <div key={i} className="flex items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${i + 1 <= currentStep ? 'bg-green-500 border-green-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>
          {i + 1}
        </div>
        {i < totalSteps - 1 && <div className={`h-1 w-8 sm:w-12 transition-all duration-300 ${i + 1 < currentStep ? 'bg-green-500' : 'bg-gray-600'}`}></div>}
      </div>
    ))}
  </div>
);

interface MealPlanItem { day: string; meal: string; tags: string[]; }
interface LeisureSuggestion { activity: string; cost: string; description: string; }
interface AiPlan { mealPlan: MealPlanItem[]; budgetSuggestion: string; leisureSuggestion: LeisureSuggestion; }

export default function FamilyPlannerModule() {
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [familyMembers, setFamilyMembers] = useState([{ age: '', role: 'Adulto', extra_details: '' }]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [cookingStyle, setCookingStyle] = useState('');
  const [financialGoals, setFinancialGoals] = useState('');
  const [leisureActivities, setLeisureActivities] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [aiPlan, setAiPlan] = useState<AiPlan | null>(null);

  useEffect(() => {
    const fetchLatestPlan = async () => {
        if (session?.user?.email) {
            try {
                // CORRECCIÓN: Se ajusta la URL para que coincida con el backend
                const response = await apiClient.get('/family-plan/latest', {
                    headers: { 'Authorization': `Bearer ${session.user.email}` }
                });
                if (response.data) {
                    setAiPlan(response.data);
                    setStep(totalSteps + 1);
                }
            } catch (error) {
                console.log("No se encontró un plan familiar previo. Se iniciará el flujo normal.");
            } finally {
                setIsLoading(false);
            }
        } else if (status === 'unauthenticated') {
            setIsLoading(false);
        }
    };
    fetchLatestPlan();
  }, [session, status]);

  const handleMemberChange = (index: number, field: string, value: string) => {
    const newMembers = [...familyMembers];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFamilyMembers(newMembers);
  };

  const addMember = () => setFamilyMembers([...familyMembers, { age: '', role: 'Niño/a', extra_details: '' }]);
  const removeMember = (index: number) => setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  const handleCheckboxChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    setter(prev => prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]);
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, totalSteps + 1));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));
  
  const generateFamilyPlan = async () => {
    if (!session?.user?.email || !cookingStyle || !financialGoals || familyMembers.length === 0 || familyMembers.some(m => !m.age)) {
      toast.error("Por favor, completá todos los campos para generar el plan.");
      return;
    }
    setIsLoading(true);
    setAiPlan(null);
    const toastId = toast.loading("Resi está creando el Mapa de Ruta para tu familia...");

    const planRequest = {
      familyMembers,
      dietaryPreferences,
      cookingStyle,
      financialGoals,
      leisureActivities,
    };

    try {
      // CORRECCIÓN: Se ajusta la URL para que coincida con el backend
      const response = await apiClient.post('/family-plan/generate', planRequest, {
        headers: { 'Authorization': `Bearer ${session.user.email}` }
      });
      setAiPlan(response.data);
      toast.success("¡Mapa de Ruta Familiar generado!", { id: toastId });
      handleNext();
    } catch (error) {
      console.error("Error al generar el plan familiar:", error);
      toast.error("Hubo un error al generar el plan.", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch(step) {
        case 1:
            return ( <div className="space-y-4 animate-fade-in"> <h3 className="text-2xl font-bold text-green-400 flex items-center gap-2"><FaUsers />Paso 1: El Equipo</h3> <p className="text-gray-300">Contale a Resi quiénes forman parte de tu familia. Agrega cualquier detalle que deba tener en cuenta para el plan.</p> {familyMembers.map((member, index) => ( <div key={index} className="flex flex-col md:flex-row items-start md:items-center gap-2 bg-gray-700 p-2 rounded-lg"> <select value={member.role} onChange={e => handleMemberChange(index, 'role', e.target.value)} className="bg-gray-800 p-2 rounded-md border border-gray-600"> <option>Adulto</option> <option>Niño/a</option> </select> <input type="number" placeholder="Edad" value={member.age} onChange={e => handleMemberChange(index, 'age', e.target.value)} className="bg-gray-800 p-2 rounded-md w-full md:w-24 border border-gray-600" /> <input type="text" placeholder="Detalles adicionales (ej: usa silla de ruedas)" value={member.extra_details} onChange={e => handleMemberChange(index, 'extra_details', e.target.value)} className="bg-gray-800 p-2 rounded-md w-full border border-gray-600" /> {familyMembers.length > 1 && <button onClick={() => removeMember(index)} className="p-2 text-red-400 hover:text-red-300"><FaTrashAlt /></button>} </div> ))} <button onClick={addMember} className="w-full flex items-center justify-center gap-2 p-2 bg-green-800 hover:bg-green-700 rounded-md font-semibold"><FaUserPlus /> Agregar Miembro</button> </div> );
        case 2:
            return ( <div className="space-y-4 animate-fade-in"> <h3 className="text-2xl font-bold text-green-400 flex items-center gap-2"><FaAppleAlt />Paso 2: La Mesa</h3> <p className="text-gray-300">¿Hay alguna preferencia o restricción alimentaria?</p> <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {['Vegetariano', 'Sin TACC (celíaco)', 'Sin Lactosa', 'Bajo en Sodio'].map(pref => ( <label key={pref} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${dietaryPreferences.includes(pref) ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-700 hover:bg-gray-600'}`}> <input type="checkbox" checked={dietaryPreferences.includes(pref)} onChange={() => handleCheckboxChange(setDietaryPreferences, pref)} className="w-5 h-5 text-green-600 bg-gray-900 border-gray-600 rounded focus:ring-green-500 focus:ring-2"/> <span className="font-medium">{pref}</span> </label> ))} </div> </div> );
        case 3:
            return ( <div className="space-y-4 animate-fade-in"> <h3 className="text-2xl font-bold text-green-400 flex items-center gap-2"><FaUtensils />Paso 3: El Estilo</h3> <p className="text-gray-300">¿Qué tipo de cocina prefieren en casa?</p> <div className="flex flex-col gap-3"> {['Rápido y Fácil', 'Casero Tradicional', 'Gourmet / Elaborado'].map(style => ( <button key={style} onClick={() => setCookingStyle(style)} className={`p-3 rounded-lg border-2 text-left transition-colors ${cookingStyle === style ? 'border-green-500 bg-green-900/50' : 'border-gray-600 hover:bg-gray-700'}`}>{style}</button> ))} </div> </div> );
        case 4:
            return ( <div className="space-y-4 animate-fade-in"> <h3 className="text-2xl font-bold text-green-400 flex items-center gap-2"><FaPiggyBank />Paso 4: Las Metas</h3> <p className="text-gray-300">¿Cuál es el principal objetivo financiero familiar para los próximos 6 meses?</p> <input type="text" placeholder="Ej: Ahorrar para las vacaciones, saldar la tarjeta..." value={financialGoals} onChange={e => setFinancialGoals(e.target.value)} className="bg-gray-700 p-3 rounded-md w-full border border-gray-600" /> </div> );
        case 5:
            return ( <div className="space-y-4 animate-fade-in"> <h3 className="text-2xl font-bold text-green-400 flex items-center gap-2"><FaGamepad />Paso 5: La Diversión</h3> <p className="text-gray-300">¿Qué actividades de ocio disfrutan más?</p> <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {['Aire Libre (parques, bici)', 'Juegos de Mesa', 'Películas y Series en casa', 'Manualidades / Cocina'].map(act => ( <label key={act} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${leisureActivities.includes(act) ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-700 hover:bg-gray-600'}`}> <input type="checkbox" checked={leisureActivities.includes(act)} onChange={() => handleCheckboxChange(setLeisureActivities, act)} className="w-5 h-5 text-green-600 bg-gray-900 border-gray-600 rounded focus:ring-green-500 focus:ring-2"/> <span className="font-medium">{act}</span> </label> ))} </div> </div> );
        case 6:
            return ( <div className="space-y-6 animate-fade-in"> <h3 className="text-3xl font-bold text-green-400 text-center">🗺️ ¡Tu Mapa de Ruta Familiar!</h3> {aiPlan ? ( <div className="space-y-4 text-left"> <div className="bg-gray-700 p-4 rounded-lg"> <h4 className="font-bold text-white text-lg mb-2">🍴 Menú Semanal Sugerido</h4> <ul className="list-disc list-inside text-gray-300 space-y-1"> {aiPlan.mealPlan.map(item => <li key={item.day}><span className="font-semibold">{item.day}:</span> {item.meal}</li>)} </ul> </div> <div className="bg-gray-700 p-4 rounded-lg"> <h4 className="font-bold text-white text-lg mb-2">💰 Consejo de Ahorro</h4> <p className="text-gray-300">{aiPlan.budgetSuggestion}</p> </div> <div className="bg-gray-700 p-4 rounded-lg"> <h4 className="font-bold text-white text-lg mb-2">🎉 Actividad Recomendada</h4> <p className="text-gray-300"><span className="font-semibold">{aiPlan.leisureSuggestion.activity} (Costo: {aiPlan.leisureSuggestion.cost}):</span> {aiPlan.leisureSuggestion.description}</p> </div> </div> ) : <p className="text-center text-gray-400">Generando tu plan...</p>} <button onClick={() => { setAiPlan(null); setStep(1); }} className="w-full mt-4 p-2 bg-gray-600 hover:bg-gray-500 rounded-md font-semibold">Crear un nuevo plan</button> </div> );
        default: return null;
    }
  };

  if (status === 'unauthenticated') {
    return ( <div className="text-center p-8"> <h3 className="text-2xl font-bold text-white mb-4">Creá el Mapa de Ruta de tu Familia</h3> <p className="text-gray-300 mb-6">Iniciá sesión para que la IA de Resi te ayude a crear un plan de comidas, ahorro y ocio.</p> <button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">Ingresar para empezar</button> </div> );
  }
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 md:p-8 text-white">
      {step <= totalSteps && <StepIndicator currentStep={step} totalSteps={totalSteps} />}
      <div className="min-h-[400px] flex flex-col justify-center">
        {isLoading ? <div className="flex justify-center items-center"><FaMicrochip className="animate-spin text-4xl text-green-400"/></div> : renderStepContent()}
      </div>
      <div className="flex justify-between mt-8">
        <button onClick={handleBack} disabled={step === 1 || step > totalSteps} className="px-6 py-2 bg-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-500 font-semibold"><FaArrowLeft /></button>
        {step <= totalSteps ? (
          <button 
            onClick={step === totalSteps ? generateFamilyPlan : handleNext} 
            disabled={isLoading && step === totalSteps}
            className="px-6 py-2 bg-green-600 rounded-md disabled:opacity-50 hover:bg-green-500 flex items-center gap-2 font-semibold"
          >
            {isLoading && step === totalSteps ? <><FaMicrochip className="animate-spin" /> Generando...</> : (step === totalSteps ? <>Generar Plan <FaRobot /></> : <>Siguiente <FaArrowRight /></>)}
          </button>
        ) : null}
      </div>
    </div>
  );
}