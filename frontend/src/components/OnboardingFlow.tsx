// En: frontend/src/components/OnboardingFlow.tsx

'use client';

import { useState, useEffect } from 'react';
import { FaArrowLeft, FaArrowRight, FaChartPie, FaMicrophone, FaPlus, FaCheck, FaInfoCircle, FaRobot, FaGoogle, FaMap, FaLightbulb, FaDollarSign, FaUserTie, FaBirthdayCake, FaUsers, FaShieldAlt, FaRocket, FaPiggyBank } from 'react-icons/fa';
import { useSession, signIn } from 'next-auth/react';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';

interface OnboardingFlowProps {
  onboardingCompleted: boolean;
  onboardingCompleteHandler: () => void;
}

const OnboardingFlow = ({ onboardingCompleted, onboardingCompleteHandler }: OnboardingFlowProps) => {
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const totalSteps = 5; // Total de 5 pasos ahora

  // Estados para todos los datos del formulario
  const [income, setIncome] = useState<number | ''>('');
  const [occupation, setOccupation] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [familyGroup, setFamilyGroup] = useState<number | ''>(1);
  const [riskProfile, setRiskProfile] = useState('');
  const [longTermGoals, setLongTermGoals] = useState('');

  useEffect(() => {
    if (status === 'authenticated' && !onboardingCompleted) {
      setStep(4); // Inicia en el primer paso de recolección de datos
    }
    if (onboardingCompleted) {
      setStep(1);
    }
  }, [status, onboardingCompleted]);

  const handleNext = () => setStep(prev => Math.min(totalSteps, prev + 1));
  const handleBack = () => setStep(prev => Math.max(1, prev - 1));

  const handleStartWithData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (income && occupation && age && familyGroup && riskProfile && longTermGoals && session?.user?.email) {
      const onboardingData = {
        income: income as number,
        occupation,
        age: age as number,
        familyGroup: familyGroup as number,
        risk_profile: riskProfile,
        long_term_goals: longTermGoals,
      };

      const toastId = toast.loading("Guardando tu información y creando tu primer presupuesto...");
      try {
        await apiClient.post('/onboarding-complete', onboardingData, {
          headers: { 'Authorization': `Bearer ${session.user.email}` },
        });
        toast.success("¡Información guardada con éxito!", { id: toastId });
        onboardingCompleteHandler();
      } catch (error) {
        console.error("Error al guardar la información del usuario:", error);
        toast.error("Error al guardar la información.", { id: toastId });
      }
    } else {
      toast.error("Por favor, completa todos los campos.");
    }
  };

  const renderStepContent = () => {
      switch (step) {
        case 1:
          return (
            <div className="text-center space-y-4">
              <h3 className="text-3xl font-bold text-green-400">¡Bienvenido a Resi!</h3>
              <p className="text-lg text-gray-300">
                Soy tu asistente de <span className="text-green-400 font-semibold">resiliencia financiera y alimentaria</span>. Mi misión es ayudarte a tomar el control de tu dinero, reducir el estrés y sembrar tu futuro.
              </p>
              <div className="flex justify-center mt-4">
                <FaRobot size={64} className="text-green-400" />
              </div>
            </div>
          );
        case 2:
          return (
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-green-400 text-center">Tu Panel de Control, Tu Mapa</h3>
              <p className="text-lg text-gray-300 text-center">
                El panel es tu mapa. Aquí verás en tiempo real cómo se mueve tu dinero cada mes.
              </p>
              <div className="bg-gray-700 p-4 rounded-lg space-y-3 shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="p-2 rounded-lg bg-gray-600">
                    <p className="text-gray-400">Ingreso Mensual</p>
                    <p className="text-xl font-bold text-green-400">$868.000</p>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-600">
                    <p className="text-gray-400">Total Gastado</p>
                    <p className="text-xl font-bold text-red-400">$10.000</p>
                  </div>
                  <div className="p-2 rounded-lg bg-gray-600">
                    <p className="text-gray-400">Dinero Restante</p>
                    <p className="text-xl font-bold text-blue-400">$858.000</p>
                  </div>
                </div>
                <div className="mt-4">
                  <h4 className="text-md font-semibold mb-2 flex items-center space-x-2 justify-center"><FaMap className="text-white" /> Progreso por Categoría</h4>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between items-center text-sm mb-1">
                        <span className="font-semibold">🛒 Supermercado</span>
                        <span className="text-gray-400">$10.000 / $50.000</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-3">
                        <div className="bg-green-500 h-3 rounded-full" style={{ width: `20%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        case 3:
          return (
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-green-400 text-center">El Planificador, Tu Brújula</h3>
              <p className="text-lg text-gray-300 text-center">
                Tu trabajo es simple: cuéntame tus gastos. Juntos, haremos un mapa real de tu dinero.
              </p>
              <div className="bg-gray-700 p-4 rounded-lg shadow-md space-y-4">
                <div className="flex items-center space-x-2 text-sm">
                  <FaChartPie size={20} className="text-yellow-400" />
                  <p>
                    <span className="text-white font-semibold">Define tus metas:</span> Establece un presupuesto para cada categoría.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <FaMicrophone size={20} className="text-yellow-400" />
                  <p>
                    <span className="text-white font-semibold">Registro fácil:</span> Usa el botón <span className="font-mono text-green-400">+</span> para registrar un gasto o el micrófono para usar tu voz.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <FaLightbulb size={20} className="text-yellow-400" />
                  <p>
                    <span className="text-white font-semibold">La IA aprende:</span> Cada gasto entrena a Resi, que con el tiempo te dará recomendaciones personalizadas y precisas.
                  </p>
                </div>
              </div>
            </div>
          );
        case 4:
            if (onboardingCompleted) {
                return ( <div className="text-center space-y-6"><h3 className="text-2xl md:text-3xl font-bold text-green-400">¡Onboarding completado!</h3><p className="text-lg text-gray-300">Tu ingreso ya está visible en el panel superior.</p><p className="text-md text-gray-400">Puedes ir al panel de control para ver el detalle de tu presupuesto.</p></div> );
            } else if (status === 'authenticated') {
                return (
                    <div className="space-y-6 text-center">
                      <h3 className="text-3xl font-bold text-green-400">¡Hola, {session?.user?.name}!</h3>
                      <p className="text-lg text-gray-300">Para generar un plan financiero personalizado, necesito algunos datos.</p>
                      <form onSubmit={(e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
                         <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaDollarSign /></span><input type="number" placeholder="Ingreso mensual promedio" value={income} onChange={(e) => setIncome(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" required /></div>
                         <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaUserTie /></span><input type="text" placeholder="Ocupación" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" required /></div>
                         <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaBirthdayCake /></span><input type="number" placeholder="Edad" value={age} onChange={(e) => setAge(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" required /></div>
                         <div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaUsers /></span><input type="number" placeholder="Miembros del grupo familiar" value={familyGroup} onChange={(e) => setFamilyGroup(e.target.value === '' ? '' : parseFloat(e.target.value))} className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" required /></div>
                      </form>
                    </div>
                );
            } else {
                return (
                    <div className="space-y-6 text-center">
                      <h3 className="text-3xl font-bold text-green-400">¡Listos para la Acción!</h3>
                      <p className="text-lg text-gray-300">Para guardar tu progreso y recibir asistencia personalizada de Resi, debes iniciar sesión.</p>
                      <div className="flex justify-center space-x-4 mt-6">
                        <button onClick={() => signIn('google')} className="px-6 py-2 bg-green-500 text-white font-semibold rounded-md flex items-center space-x-2 hover:bg-green-600 transition-colors">
                          <FaGoogle />
                          Iniciar sesión con Google
                        </button>
                      </div>
                    </div>
                );
            }
        case 5:
            return (
                <div className="space-y-6 text-center">
                  <h3 className="text-3xl font-bold text-green-400">Contame un poco más</h3>
                  <p className="text-lg text-gray-300">Esta información nos ayudará a darte consejos mucho más precisos.</p>
                  <form onSubmit={handleStartWithData} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">¿Cómo te considerás con tu plata?</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => setRiskProfile('Conservador')} className={`p-2 rounded-md border-2 ${riskProfile === 'Conservador' ? 'border-green-500 bg-green-900/50' : 'border-gray-600 hover:bg-gray-700'}`}><FaShieldAlt className="mx-auto mb-1"/>Conservador</button>
                            <button type="button" onClick={() => setRiskProfile('Moderado')} className={`p-2 rounded-md border-2 ${riskProfile === 'Moderado' ? 'border-green-500 bg-green-900/50' : 'border-gray-600 hover:bg-gray-700'}`}><FaPiggyBank className="mx-auto mb-1"/>Moderado</button>
                            <button type="button" onClick={() => setRiskProfile('Audaz')} className={`p-2 rounded-md border-2 ${riskProfile === 'Audaz' ? 'border-green-500 bg-green-900/50' : 'border-gray-600 hover:bg-gray-700'}`}><FaRocket className="mx-auto mb-1"/>Audaz</button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="goals" className="block text-sm font-medium text-gray-400 mb-2">¿Cuál es tu principal meta financiera a largo plazo?</label>
                        <input id="goals" type="text" placeholder="Ej: Comprar una casa, cambiar el auto, jubilarme..." value={longTermGoals} onChange={(e) => setLongTermGoals(e.target.value)} className="w-full px-4 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500" required />
                    </div>
                    <button type="submit" className="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50" disabled={!riskProfile || !longTermGoals}>
                      <FaCheck className="mr-2 inline" />
                      Crear mi presupuesto
                    </button>
                  </form>
                </div>
            );
        default:
          return null;
      }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-4xl p-6 bg-gray-800 rounded-lg shadow-xl mb-6 min-h-[450px] flex items-center justify-center">
        {renderStepContent()}
      </div>
      <div className="flex justify-between w-full max-w-4xl px-6">
        <button
          onClick={handleBack}
          disabled={step === 1 || (status === 'authenticated' && !onboardingCompleted && step === 4)}
          className="px-4 py-2 bg-gray-700 text-white rounded-md disabled:opacity-50 hover:bg-gray-600 transition-colors"
        >
          <FaArrowLeft />
        </button>
        <span className="text-gray-400">{`Paso ${step} de ${totalSteps}`}</span>
        <button
          onClick={step === totalSteps ? handleStartWithData : handleNext}
          disabled={ (status !== 'authenticated' && step >= 4) || (step === 4 && (!income || !occupation || !age || !familyGroup))}
          className="px-4 py-2 bg-gray-700 text-white rounded-md disabled:opacity-50 hover:bg-gray-600 transition-colors"
        >
          <FaArrowRight />
        </button>
      </div>
    </div>
  );
};

export default OnboardingFlow;

