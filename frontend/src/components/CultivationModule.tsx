// En: frontend/src/components/CultivationModule.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FaSeedling, FaCalculator, FaTools, FaBook, FaRobot, FaClipboardCheck, FaCalendarAlt, FaChartBar, FaPlus,
  FaCheckCircle, FaExclamationCircle, FaDollarSign, FaBoxes, FaLeaf, FaMicrochip, FaDownload, FaImage, FaTrashAlt, FaSun, FaLightbulb, FaSmile, FaMapMarkerAlt, FaCircle
} from "react-icons/fa";
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import { useSession, signIn } from 'next-auth/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TabButtonProps {
    isActive: boolean;
    onClick: () => void;
    icon: React.ElementType;
    label: string;
}

const TabButton = ({ isActive, onClick, icon: Icon, label }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`flex-1 px-2 py-2 flex flex-col items-center justify-center space-y-1 transition-colors duration-200 
      ${isActive ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} rounded-md text-sm md:text-base`}
  >
    <Icon size={20} />
    <span className="hidden md:inline-block text-center">{label}</span>
  </button>
);

interface AiPlanResult {
    crop: string;
    system: string;
    materials: string;
    projectedSavings: string;
    tips: string;
    imagePrompt?: string; 
}
interface CultivationPlan {
    plan_data: AiPlanResult;
    created_at: string;
}
interface ValidationResult {
    isValid: boolean;
    advice: string;
}

interface ChatResponse {
    response: string;
    imagePrompt?: string;
}

interface HarvestLog {
    id: number;
    crop_name: string;
    quantity: number;
    unit: string;
    harvest_date: string;
}
interface CultivationTask {
    id: number;
    task_name: string;
    crop_name?: string;
    due_date: string;
    is_completed: boolean;
}
interface AnalysisData {
  month: string;
  yield: number;
  savings: number;
}


interface CultivationModuleProps {
    initialMethod: string;
    userFinancialData: { supermarketSpending: number } | null;
}

export default function CultivationModule({ initialMethod, userFinancialData }: CultivationModuleProps) {
  const { data: session, status } = useSession();
  const [method, setMethod] = useState(initialMethod);
  const [activeTab, setActiveTab] = useState('planificacion');
  const [latestPlan, setLatestPlan] = useState<CultivationPlan | null>(null);

  // Estados para nuevas pestañas
  const [harvestLogs, setHarvestLogs] = useState<HarvestLog[]>([]);
  const [newHarvest, setNewHarvest] = useState({ crop_name: '', quantity: '', unit: 'kg' });
  const [cultivationTasks, setCultivationTasks] = useState<CultivationTask[]>([]);
  const [newTask, setNewTask] = useState({ task_name: '', due_date: '', crop_name: '' });
  const [analysisData, setAnalysisData] = useState<AnalysisData[]>([]);

  // Estados Unificados para Planificación
  const [space, setSpace] = useState('');
  const [experience, setExperience] = useState('');
  const [light, setLight] = useState('');
  const [soilType, setSoilType] = useState('');
  const [location, setLocation] = useState('mendoza');
  const [initialBudget, setInitialBudget] = useState<number | ''>('');
  const [aiPlanResult, setAiPlanResult] = useState<AiPlanResult | null>(null);
  const [loadingAiPlan, setLoadingAiPlan] = useState(false);

  // Estados Unificados para Control
  const [ph, setPh] = useState('');
  const [ec, setEc] = useState('');
  const [temp, setTemp] = useState('');
  const [soilMoisture, setSoilMoisture] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [aiControlAdvice, setAiControlAdvice] = useState<string | null>(null);
  const [loadingControlAdvice, setLoadingControlAdvice] = useState(false);

  // Estados Unificados para Asistencia IA
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiImageResponse, setAiImageResponse] = useState<string | null>(null);
  const [loadingAiChat, setLoadingAiChat] = useState(false);

  // Estados Unificados para Calculadora de Ahorro
  const [monthlyVegetableExpense, setMonthlyVegetableExpense] = useState('');
  const [projectedSavings, setProjectedSavings] = useState(0);
  
  // Nuevo: Cargar el último plan al montar el componente
  useEffect(() => {
    const fetchLatestPlan = async () => {
      if (session?.user?.email) {
        try {
          const response = await apiClient.get<CultivationPlan>('/cultivation/latest', {
            headers: { 'Authorization': `Bearer ${session.user.email}` }
          });
          setLatestPlan(response.data);
        } catch (error) {
          console.error("No se encontró un plan de cultivo previo.", error);
        }
      }
    };
    fetchLatestPlan();
  }, [session]);
  
  const fetchHarvests = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
        const response = await apiClient.get('/cultivation/harvests', { headers: { 'Authorization': `Bearer ${session.user.email}` } });
        setHarvestLogs(response.data);
    } catch (error) {
        console.error("Error fetching harvests:", error);
        toast.error("No se pudieron cargar los registros de cosecha.");
    }
  }, [session]);
  
  const fetchTasks = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
        const response = await apiClient.get('/cultivation/tasks', { headers: { 'Authorization': `Bearer ${session.user.email}` } });
        setCultivationTasks(response.data);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        toast.error("No se pudieron cargar las tareas del calendario.");
    }
  }, [session]);

  const fetchAnalysisData = useCallback(async () => {
    if (!session?.user?.email) return;
    try {
        const response = await apiClient.get('/cultivation/analysis/monthly-data', { headers: { 'Authorization': `Bearer ${session.user.email}` } });
        setAnalysisData(response.data);
    } catch (error) {
        console.error("Error fetching analysis data:", error);
        toast.error("No se pudieron cargar los datos de análisis.");
    }
  }, [session]);

  useEffect(() => {
    if (activeTab === 'cosecha') fetchHarvests();
    if (activeTab === 'calendario') fetchTasks();
    if (activeTab === 'analisis-rendimiento') fetchAnalysisData();
  }, [activeTab, fetchHarvests, fetchTasks, fetchAnalysisData]);

  const handleAddHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email) return;
    const toastId = toast.loading("Registrando cosecha...");
    try {
        await apiClient.post('/cultivation/harvests', { 
            crop_name: newHarvest.crop_name,
            quantity: parseFloat(newHarvest.quantity),
            unit: newHarvest.unit
        }, { headers: { 'Authorization': `Bearer ${session.user.email}` } });
        toast.success("Cosecha registrada con éxito!", { id: toastId });
        setNewHarvest({ crop_name: '', quantity: '', unit: 'kg' });
        fetchHarvests();
    } catch (error) {
        toast.error("Error al registrar la cosecha.", { id: toastId });
    }
  };

  const handleDeleteHarvest = async (id: number) => {
    if (!session?.user?.email) return;
    if (window.confirm("¿Estás seguro de que quieres eliminar este registro?")) {
      try {
        await apiClient.delete(`/cultivation/harvests/${id}`, { headers: { 'Authorization': `Bearer ${session.user.email}` } });
        toast.success("Registro de cosecha eliminado.");
        fetchHarvests();
      } catch (error) {
        toast.error("No se pudo eliminar el registro.");
      }
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email) return;
    const toastId = toast.loading("Agregando tarea...");
    try {
        await apiClient.post('/cultivation/tasks', { 
            task_name: newTask.task_name,
            due_date: newTask.due_date,
            crop_name: newTask.crop_name || null,
        }, { headers: { 'Authorization': `Bearer ${session.user.email}` } });
        toast.success("Tarea agregada con éxito!", { id: toastId });
        setNewTask({ task_name: '', due_date: '', crop_name: '' });
        fetchTasks();
    } catch (error) {
        toast.error("Error al agregar la tarea.", { id: toastId });
    }
  };

  const handleToggleTask = async (id: number) => {
    if (!session?.user?.email) return;
    try {
        await apiClient.patch(`/cultivation/tasks/${id}/toggle`, {}, { headers: { 'Authorization': `Bearer ${session.user.email}` } });
        toast.success("Tarea actualizada.");
        fetchTasks();
    } catch (error) {
        toast.error("No se pudo actualizar la tarea.");
    }
  };


  const generateAiPlan = async () => {
    if (!session?.user?.email) {
        toast.error('Debes iniciar sesión para pedir un plan a Resi.');
        return;
    }
    setLoadingAiPlan(true);
    setAiPlanResult(null);
    const toastId = toast.loading('Resi está diseñando tu plan de cultivo...');

    const planRequest = {
      method,
      space,
      experience,
      light: method === 'hydroponics' ? light : undefined,
      soilType: method === 'organic' ? soilType : undefined,
      location,
      initialBudget: initialBudget || 0,
      supermarketSpending: userFinancialData?.supermarketSpending || 0
    };

    try {
        const response = await apiClient.post('/cultivation/generate-plan', planRequest, {
            headers: { 'Authorization': `Bearer ${session.user.email}` }
        });
        setAiPlanResult(response.data);
        toast.success('¡Plan generado con éxito!', { id: toastId });
    } catch (error: any) {
        // CORRECCIÓN: Se maneja el error para mostrar el mensaje específico
        const errorMsg = error.response?.data?.detail || "Hubo un error al generar tu plan. Inténtalo de nuevo.";
        console.error("Error al generar el plan de IA:", error);
        toast.error(errorMsg, { id: toastId });
    } finally {
        setLoadingAiPlan(false);
    }
  };
  
  const validateParameters = async () => {
    if (!session?.user?.email) {
      toast.error('Debes iniciar sesión para validar parámetros.');
      return;
    }
    setLoadingControlAdvice(true);
    setAiControlAdvice(null);
    try {
        const response = await apiClient.post<ValidationResult>('/cultivation/validate-parameters', {
            method,
            ph: ph ? parseFloat(ph) : null,
            ec: ec ? parseFloat(ec) : null,
            temp: temp ? parseFloat(temp) : null,
            soilMoisture: soilMoisture ? parseFloat(soilMoisture) : null,
        }, {
            headers: { 'Authorization': `Bearer ${session.user.email}` }
        });
        setValidationResult(response.data);
        setAiControlAdvice(response.data.advice);
    } catch (error) {
        console.error("Error al validar parámetros:", error);
        toast.error("No se pudo validar la información.");
    } finally {
        setLoadingControlAdvice(false);
    }
  };
  
  const sendAiQuestion = async (isImageRequest = false) => {
    if (!aiQuestion.trim() || !session?.user?.email) {
        toast.error('Debes iniciar sesión y escribir una pregunta.');
        return;
    }
    setLoadingAiChat(true);
    setAiResponse('');
    setAiImageResponse(null);
    
    try {
        const response = await apiClient.post('/cultivation/chat', {
            question: aiQuestion,
            method: method
        }, {
            headers: { 'Authorization': `Bearer ${session.user.email}` }
        });
        setAiResponse(response.data.response);
        if (isImageRequest && response.data.imagePrompt) {
            setAiImageResponse(`https://via.placeholder.com/600x400?text=${encodeURIComponent(response.data.imagePrompt)}`);
        }
    } catch (error) {
        console.error("Error en el chat con IA:", error);
        toast.error("Resi no pudo procesar tu pregunta ahora mismo.");
    } finally {
        setLoadingAiChat(false);
    }
  };
  
  const calculateSavings = (e: React.FormEvent) => {
    e.preventDefault();
    if (monthlyVegetableExpense) {
      const expense = parseFloat(monthlyVegetableExpense);
      setProjectedSavings(expense * 0.25);
    }
  };

  const clearChat = () => {
    setAiQuestion('');
    setAiResponse('');
    setAiImageResponse(null);
  };

  const isPlanButtonDisabled = !space || !experience || !location || !initialBudget || (method === 'hydroponics' && !light) || (method === 'organic' && !soilType) || loadingAiPlan;
  
  if (status === 'unauthenticated') {
    return (
        <div className="text-center p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Tu Huerto Inteligente te Espera</h3>
            <p className="text-gray-300 mb-6">Iniciá sesión para recibir planes de cultivo personalizados por la IA, controlar tus parámetros y descubrir cuánto podés ahorrar.</p>
            <button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">
                Ingresar para empezar
            </button>
        </div>
    );
  }

  return (
    <div className="space-y-6 text-gray-300">
      <div className="bg-gray-700/50 p-4 rounded-lg text-center">
        <p className="text-gray-300">Basado en tus finanzas, este mes gastaste <span className="font-bold text-green-400">${userFinancialData?.supermarketSpending.toLocaleString('es-AR') || '...'}</span> en supermercado. ¡Vamos a reducir ese número!</p>
      </div>
      
      <div className="flex justify-center flex-wrap gap-2 md:space-x-4 mb-8">
        <TabButton isActive={activeTab === 'planificacion'} onClick={() => setActiveTab('planificacion')} icon={FaSeedling} label="Planificación" />
        <TabButton isActive={activeTab === 'control'} onClick={() => setActiveTab('control')} icon={FaTools} label="Control" />
        <TabButton isActive={activeTab === 'ahorro'} onClick={() => setActiveTab('ahorro')} icon={FaCalculator} label="Ahorro" />
        <TabButton isActive={activeTab === 'plan-guardado'} onClick={() => setActiveTab('plan-guardado')} icon={FaLeaf} label="Plan Guardado" />
        <TabButton isActive={activeTab === 'ia-chat'} onClick={() => setActiveTab('ia-chat')} icon={FaRobot} label="Asistencia IA" />
        <TabButton isActive={activeTab === 'cosecha'} onClick={() => setActiveTab('cosecha')} icon={FaClipboardCheck} label="Cosecha" />
        <TabButton isActive={activeTab === 'calendario'} onClick={() => setActiveTab('calendario')} icon={FaCalendarAlt} label="Calendario" />
        <TabButton isActive={activeTab === 'analisis-rendimiento'} onClick={() => setActiveTab('analisis-rendimiento')} icon={FaChartBar} label="Rendimiento" />
      </div>

      <div className="bg-gray-800 p-6 md:p-8 rounded-lg shadow-lg min-h-[500px]">
        {activeTab === 'planificacion' && (
          <div className="space-y-8">
            <h3 className="text-3xl font-bold text-green-400 text-center mb-6">
              {method === 'hydroponics' ? 'Planificación Hidropónica con IA' : 'Planificación de Huerto Orgánico con IA'}
            </h3>
            <p className="text-center text-lg mb-8">
              Cuéntale a Resi sobre tu proyecto y te ayudará a diseñar tu huerto ideal.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="space-select" className="block text-sm font-medium text-gray-400 mb-1">¿Cuánto espacio tienes?</label>
                <select id="space-select" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-green-500 focus:border-green-500" value={space} onChange={(e) => setSpace(e.target.value)}>
                  <option value="">Selecciona...</option>
                  <option value="pequeño">Balcón pequeño / Cocina</option>
                  <option value="mediano">Terraza mediana / Patio chico</option>
                  <option value="grande">Patio grande / Invernadero</option>
                </select>
              </div>
              <div>
                <label htmlFor="experience-select" className="block text-sm font-medium text-gray-400 mb-1">¿Cuál es tu experiencia?</label>
                <select id="experience-select" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-green-500 focus:border-green-500" value={experience} onChange={(e) => setExperience(e.target.value)}>
                  <option value="">Selecciona...</option>
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>
              {method === 'hydroponics' ? (
                <div>
                  <label htmlFor="light-select" className="block text-sm font-medium text-gray-400 mb-1">¿Cuánta luz natural recibe?</label>
                  <select id="light-select" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-green-500 focus:border-green-500" value={light} onChange={(e) => setLight(e.target.value)}>
                    <option value="">Selecciona...</option>
                    <option value="poca-luz">Poca luz (menos de 4 hs/día)</option>
                    <option value="mucha-luz">Mucha luz (más de 6 hs/día)</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="soil-type-select" className="block text-sm font-medium text-gray-400 mb-1">¿Qué tipo de suelo tienes?</label>
                  <select id="soil-type-select" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-green-500 focus:border-green-500" value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                    <option value="">Selecciona...</option>
                    <option value="arcilloso">Suelo arcilloso</option>
                    <option value="arenoso">Suelo arenoso</option>
                    <option value="franco">Suelo franco (ideal)</option>
                    <option value="desconocido">No estoy seguro</option>
                  </select>
                </div>
              )}
               <div>
                  <label htmlFor="location-select" className="block text-sm font-medium text-gray-400 mb-1">¿En qué provincia estás?</label>
                  <select id="location-select" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-green-500 focus:border-green-500" value={location} onChange={(e) => setLocation(e.target.value)}>
                    <option value="buenos-aires">Buenos Aires</option>
                    <option value="mendoza">Mendoza</option>
                    <option value="cordoba">Córdoba</option>
                    <option value="santa-fe">Santa Fe</option>
                    <option value="otra">Otra</option>
                  </select>
                </div>
              <div className="md:col-span-2">
                <label htmlFor="budget-input" className="block text-sm font-medium text-gray-400 mb-1">¿Cuál es tu presupuesto inicial?</label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaDollarSign /></span>
                    <input type="number" id="budget-input" className="pl-10 mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-green-500 focus:border-green-500" placeholder="Ej: 15000" value={initialBudget} onChange={(e) => setInitialBudget(e.target.value === '' ? '' : parseFloat(e.target.value))} />
                </div>
              </div>
            </div>
             <button
                onClick={generateAiPlan}
                disabled={isPlanButtonDisabled}
                className="w-full mt-6 bg-green-500 text-white font-bold py-3 px-4 rounded-md hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loadingAiPlan ? <FaMicrochip className="animate-spin mr-2" /> : <FaRobot className="mr-2" />}
                Obtener Plan de la IA
            </button>
            {aiPlanResult && (
              <div className="mt-8 p-6 bg-gray-700 rounded-lg shadow-inner space-y-4">
                <h4 className="text-2xl font-bold text-white">Tu Plan Personalizado por Resi:</h4>
                <div className="text-lg space-y-2">
                  <p><span className="font-semibold text-white">Cultivo Sugerido:</span> <span className="text-green-300">{aiPlanResult.crop}</span></p>
                  <p><span className="font-semibold text-white">Sistema Recomendado:</span> <span className="text-green-300">{aiPlanResult.system}</span></p>
                  <p><span className="font-semibold text-white">Materiales Clave:</span> <span className="text-green-300">{aiPlanResult.materials}</span></p>
                  <p><span className="font-semibold text-white">Ahorro Proyectado:</span> <span className="text-green-300">{aiPlanResult.projectedSavings}</span></p>
                  <p><span className="font-semibold text-white">Tips de Resi:</span> <span className="text-green-300">{aiPlanResult.tips}</span></p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'control' && (
           <div className="space-y-6">
            <h3 className="text-3xl font-bold text-green-400 text-center mb-6">Control de Parámetros con IA</h3>
            <p className="text-center text-lg mb-8">
              Ingresa tus lecturas y Resi te dará consejos personalizados para un crecimiento óptimo.
            </p>
            <div className="space-y-4 md:space-y-0 md:flex md:space-x-4">
              <div className="flex-1">
                <label htmlFor="ph" className="block text-sm font-medium text-gray-400 mb-1">Nivel de pH</label>
                <input type="number" id="ph" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white" placeholder={method === 'hydroponics' ? "Ej: 6.0" : "Ej: 6.5"} value={ph} onChange={(e) => setPh(e.target.value)} step="0.1"/>
              </div>
             {method === 'hydroponics' ? (
                <>
                    <div className="flex-1">
                        <label htmlFor="ec" className="block text-sm font-medium text-gray-400 mb-1">Conductividad Eléctrica (EC)</label>
                        <input type="number" id="ec" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white" placeholder="Ej: 1.5" value={ec} onChange={(e) => setEc(e.target.value)} step="0.1"/>
                    </div>
                    <div className="flex-1">
                        <label htmlFor="temp" className="block text-sm font-medium text-gray-400 mb-1">Temperatura (°C)</label>
                        <input type="number" id="temp" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white" placeholder="Ej: 20" value={temp} onChange={(e) => setTemp(e.target.value)} step="1"/>
                    </div>
                </>
             ) : (
                <div className="flex-1">
                    <label htmlFor="soilMoisture" className="block text-sm font-medium text-gray-400 mb-1">Humedad del suelo (%)</label>
                    <input type="number" id="soilMoisture" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white" placeholder="Ej: 45" value={soilMoisture} onChange={(e) => setSoilMoisture(e.target.value)} step="1"/>
                </div>
             )}
            </div>
            <button onClick={validateParameters} disabled={loadingControlAdvice} className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center">
              {loadingControlAdvice ? <FaMicrochip className="animate-spin mr-2" /> : <FaTools className="mr-2" />}
              Validar Parámetros
            </button>
            {validationResult && (
              <div className={`mt-6 p-4 rounded-lg flex items-center ${validationResult.isValid ? 'bg-green-800' : 'bg-red-800'}`}>
                {validationResult.isValid ? <FaCheckCircle className="text-white text-xl mr-3" /> : <FaExclamationCircle className="text-white text-xl mr-3" />}
                <p className="text-sm text-white">{validationResult.advice}</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'ahorro' && (
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-green-400 text-center mb-6">Calculadora de Ahorro</h3>
            <p className="text-center text-lg">Descubre cuánto puedes ahorrar en un mes cultivando tus propios alimentos.</p>
            <form onSubmit={calculateSavings} className="space-y-4">
              <div>
                <label htmlFor="monthly-expense" className="block text-sm font-medium text-gray-400 mb-1">Gasto mensual promedio en vegetales</label>
                <input type="number" id="monthly-expense" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm p-2 text-white focus:ring-green-500 focus:border-green-500" placeholder="Ej: $20000" value={monthlyVegetableExpense} onChange={(e) => setMonthlyVegetableExpense(e.target.value)} required />
              </div>
              <button type="submit" className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 transition-colors duration-200 flex items-center justify-center"><FaCalculator className="mr-2" />Calcular Ahorro</button>
            </form>
            {projectedSavings > 0 && (
              <div className="mt-6 text-center text-white p-4 bg-gray-700 rounded-lg">
                <p className="text-lg">Ahorro mensual proyectado (estimación simple):</p>
                <p className="text-3xl font-bold text-green-400 mt-2">${projectedSavings.toFixed(2)}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'plan-guardado' && (
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-green-400 text-center mb-6">Tu Último Plan Guardado</h3>
              {latestPlan ? (
                  <div className="mt-8 p-6 bg-gray-700 rounded-lg shadow-inner space-y-4">
                      <h4 className="text-2xl font-bold text-white">Plan generado el: {new Date(latestPlan.created_at).toLocaleDateString('es-AR')}</h4>
                      <div className="text-lg space-y-2">
                        <p><span className="font-semibold text-white">Cultivo Sugerido:</span> <span className="text-green-300">{latestPlan.plan_data.crop}</span></p>
                        <p><span className="font-semibold text-white">Sistema Recomendado:</span> <span className="text-green-300">{latestPlan.plan_data.system}</span></p>
                        <p><span className="font-semibold text-white">Materiales Clave:</span> <span className="text-green-300">{latestPlan.plan_data.materials}</span></p>
                        <p><span className="font-semibold text-white">Ahorro Proyectado:</span> <span className="text-green-300">{latestPlan.plan_data.projectedSavings}</span></p>
                        <p><span className="font-semibold text-white">Tips de Resi:</span> <span className="text-green-300">{latestPlan.plan_data.tips}</span></p>
                      </div>
                  </div>
              ) : (
                  <p className="text-center text-gray-400">Aún no has generado ni guardado ningún plan. ¡Ve a la pestaña de Planificación para crear el tuyo!</p>
              )}
            </div>
        )}
        
        {activeTab === 'ia-chat' && (
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-green-400 text-center mb-6">Asistencia Directa con Resi</h3>
            <p className="text-center text-lg mb-4">Pregúntale a Resi cualquier duda sobre tu cultivo. La IA te dará respuestas precisas e incluso puede generar imágenes.</p>
            <div className="relative bg-gray-700 rounded-lg p-4">
              {aiResponse && (
                <div className="mb-4 text-white p-3 rounded-md bg-gray-600">
                  <p className="font-semibold text-green-400">Resi:</p>
                  <p>{aiResponse}</p>
                </div>
              )}
              {aiImageResponse && (
                <div className="mt-4 mb-4 text-center">
                  <p className="text-gray-400 mb-2">Imagen de referencia generada por IA:</p>
                  <img src={aiImageResponse} alt="Diseño de cultivo por IA" className="rounded-lg mx-auto border-4 border-gray-600 shadow-xl" />
                </div>
              )}
              {loadingAiChat && (
                <div className="flex items-center justify-center p-4">
                  <FaMicrochip className="animate-spin text-green-400 text-3xl" />
                  <p className="ml-2 text-green-400">Resi está pensando...</p>
                </div>
              )}
              <div className="flex space-x-2">
                <input type="text" className="flex-1 bg-gray-800 border border-gray-600 rounded-md shadow-sm p-2 text-white" placeholder="Ej: ¿Qué hago si mi planta tiene plagas?" value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)}/>
                <button onClick={() => sendAiQuestion()} disabled={loadingAiChat || !aiQuestion.trim()} className="bg-green-500 text-white px-4 rounded-md hover:bg-green-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"><FaRobot /></button>
                <button onClick={() => sendAiQuestion(true)} disabled={loadingAiChat || !aiQuestion.trim()} className="bg-blue-500 text-white px-4 rounded-md hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"><FaImage /></button>
                <button onClick={clearChat} className="bg-red-500 text-white px-4 rounded-md hover:bg-red-600 transition-colors duration-200"><FaTrashAlt /></button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'cosecha' && (
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-green-400 text-center mb-6">Registro de Cosecha</h3>
            <p className="text-center text-lg">Lleva un registro detallado de todo lo que cosechas. ¡Celebra tus logros!</p>
            <form onSubmit={handleAddHarvest} className="flex flex-col md:flex-row gap-4 p-4 bg-gray-700 rounded-lg">
                <input type="text" placeholder="Nombre del cultivo (ej: Tomates)" value={newHarvest.crop_name} onChange={(e) => setNewHarvest({ ...newHarvest, crop_name: e.target.value })} className="flex-1 p-2 rounded-md bg-gray-800 border border-gray-600" required />
                <input type="number" placeholder="Cantidad (ej: 2.5)" value={newHarvest.quantity} onChange={(e) => setNewHarvest({ ...newHarvest, quantity: e.target.value })} className="w-full md:w-1/4 p-2 rounded-md bg-gray-800 border border-gray-600" step="0.1" required />
                <select value={newHarvest.unit} onChange={(e) => setNewHarvest({ ...newHarvest, unit: e.target.value })} className="w-full md:w-1/4 p-2 rounded-md bg-gray-800 border border-gray-600">
                    <option value="kg">kg</option>
                    <option value="unidad">unidad</option>
                    <option value="gramos">gramos</option>
                </select>
                <button type="submit" className="md:w-auto px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"><FaPlus /></button>
            </form>
            <div className="mt-6 space-y-2">
                {harvestLogs.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left table-auto">
                            <thead>
                                <tr className="border-b border-gray-600">
                                    <th className="p-2">Cultivo</th>
                                    <th className="p-2 text-right">Cantidad</th>
                                    <th className="p-2 text-right">Fecha</th>
                                    <th className="p-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {harvestLogs.map((log) => (
                                    <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-2 font-semibold">{log.crop_name}</td>
                                        <td className="p-2 text-right">{log.quantity} {log.unit}</td>
                                        <td className="p-2 text-right">{new Date(log.harvest_date).toLocaleDateString('es-AR')}</td>
                                        <td className="p-2 text-right"><button onClick={() => handleDeleteHarvest(log.id)} className="text-red-500 hover:text-red-400"><FaTrashAlt /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-400 py-8">Aún no registraste ninguna cosecha.</p>
                )}
            </div>
          </div>
        )}

        {activeTab === 'calendario' && (
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-green-400 text-center mb-6">Calendario de Tareas</h3>
            <p className="text-center text-lg">Organiza tu huerto. Resi te recordará cuándo regar, fertilizar y podar tus plantas.</p>
             <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-4 p-4 bg-gray-700 rounded-lg">
                <input type="text" placeholder="Nombre de la tarea (ej: Podar tomates)" value={newTask.task_name} onChange={(e) => setNewTask({ ...newTask, task_name: e.target.value })} className="flex-1 p-2 rounded-md bg-gray-800 border border-gray-600" required />
                <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="w-full md:w-auto p-2 rounded-md bg-gray-800 border border-gray-600" required />
                <input type="text" placeholder="Cultivo (opcional)" value={newTask.crop_name} onChange={(e) => setNewTask({ ...newTask, crop_name: e.target.value })} className="flex-1 p-2 rounded-md bg-gray-800 border border-gray-600" />
                <button type="submit" className="md:w-auto px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"><FaPlus /></button>
            </form>
            <div className="mt-6 space-y-2">
                {cultivationTasks.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left table-auto">
                            <thead>
                                <tr className="border-b border-gray-600">
                                    <th className="p-2">Tarea</th>
                                    <th className="p-2">Cultivo</th>
                                    <th className="p-2">Fecha Límite</th>
                                    <th className="p-2 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cultivationTasks.map((task) => (
                                    <tr key={task.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-2 font-semibold">{task.task_name}</td>
                                        <td className="p-2 italic">{task.crop_name || 'General'}</td>
                                        <td className="p-2">{new Date(task.due_date).toLocaleDateString('es-AR')}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => handleToggleTask(task.id)} className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${task.is_completed ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-400'}`}>
                                                {task.is_completed ? <FaCheckCircle /> : <FaCircle size={10} />}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center text-gray-400 py-8">No hay tareas programadas. ¡Agrega una para empezar!</p>
                )}
            </div>
          </div>
        )}
        
        {activeTab === 'analisis-rendimiento' && (
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-green-400 text-center mb-6">Análisis de Rendimiento</h3>
            <p className="text-center text-lg">Visualiza el éxito de tu huerto a lo largo del tiempo. Compara el rendimiento de tus cultivos y el ahorro generado.</p>
            {analysisData.length > 0 ? (
                <div className="bg-gray-700 p-4 rounded-lg">
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={analysisData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <Line type="monotone" dataKey="yield" stroke="#8884d8" name="Cosecha (kg)" />
                            <Line type="monotone" dataKey="savings" stroke="#82ca9d" name="Ahorro ($)" />
                            <CartesianGrid stroke="#4a5568" strokeDasharray="5 5" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <p className="text-center text-gray-400 py-8">No hay suficientes datos para generar un análisis. Registra tus cosechas para empezar.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}