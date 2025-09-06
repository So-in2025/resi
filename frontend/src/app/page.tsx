// En: frontend/src/app/page.tsx
'use client';

import Accordion from "@/components/Accordion";
import AnimatedMessage from "@/components/AnimatedMessage";
import FloatingActionButton from "@/components/FloatingActionButton";
import Modal from "@/components/Modal";
import AddExpenseForm from "@/components/AddExpenseForm";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import VoiceChat from "@/components/VoiceChat";
import CultivationModule from "@/components/CultivationModule";
import OnboardingFlow from "@/components/OnboardingFlow";
import Header from "@/components/Header";
import axios from "axios";
import FinanceModule from '@/components/FinanceModule'; 
import FamilyPlannerModule from "@/components/FamilyPlannerModule";

// --- SUBCOMPONENTES ---
const HeroSection = () => (
  <div className="text-center mb-12 w-full max-w-4xl">
    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
      Resi, tu asistente de <span className="text-green-400">resiliencia</span>.
    </h1>
    <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
      Llegá a fin de mes, tomá el control de tu dinero, sembrá tu futuro y el de los tuyos.
    </p>
  </div>
);

// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
export default function HomePage() {
  // --- ESTADOS PRINCIPALES DEL ORQUESTADOR ---
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openAccordionId, setOpenAccordionId] = useState<string | null>('mis-finanzas');
  const [selectedGardeningMethod, setSelectedGardeningMethod] = useState('hydroponics');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ESTADO CLAVE: Guarda los datos que se compartirán entre módulos.
  // FinanceModule nos dará esta información, y nosotros se la pasaremos a CultivationModule.
  const [sharedFinancialData, setSharedFinancialData] = useState<{ supermarketSpending: number } | null>(null);

  // --- EFECTOS Y MANEJADORES DE EVENTOS ---

  // Efecto para verificar el estado de onboarding del usuario al cargar o cambiar la sesión.
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (session?.user?.email) {
        try {
          const response = await axios.get('http://localhost:8000/check-onboarding', {
            headers: { 'Authorization': `Bearer ${session.user.email}` },
          });
          setHasCompletedOnboarding(response.data.onboarding_completed);
        } catch (error) { 
          console.error("Error al chequear el estado de onboarding:", error);
        }
      }
      setIsLoading(false);
    };

    if (status === 'authenticated') {
      checkOnboardingStatus();
    } else if (status === 'unauthenticated') {
      setHasCompletedOnboarding(false);
      setIsLoading(false);
    }
  }, [session, status]);
  
  // Manejador para el evento de 'gasto añadido', cierra el modal.
  const handleExpenseAdded = () => {
    setIsModalOpen(false);
    // Podríamos agregar aquí una lógica para forzar la recarga de datos del FinanceModule
  };

  // Manejador para abrir/cerrar los acordeones de los módulos.
  const handleAccordionToggle = (id: string) => {
    setOpenAccordionId(openAccordionId === id ? null : id);
  };
  
  // Manejador para la navegación desde la Sidebar.
  const handleSidebarClick = (id: string) => {
    if (openAccordionId === id) return; // No hacer nada si ya está abierto
    setOpenAccordionId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  // Manejador para cuando el usuario completa el flujo de bienvenida.
  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    setOpenAccordionId('mis-finanzas'); // Llevamos al usuario directo al módulo de finanzas
  };

  // FUNCIÓN PUENTE: Esta función se pasa como prop a FinanceModule.
  // Cuando FinanceModule termina de cargar sus datos, llama a esta función
  // para "subir" la información relevante al orquestador (esta página).
  const handleFinancialDataLoaded = (data: { supermarketSpending: number }) => {
    setSharedFinancialData(data);
  };

  const moduleTitle = `Módulo 2: Tu ${selectedGardeningMethod === 'hydroponics' ? 'Sistema Hidropónico' : 'Huerto Orgánico'}`;
  
  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <>
      <Header />
      <div className="flex">
        {/* Sidebar fija en el borde izquierdo */}
        <div className="fixed top-0 left-0 h-screen md:pt-16 z-40">
          <Sidebar 
            isOpen={isSidebarOpen} 
            onOpen={() => setIsSidebarOpen(true)} 
            onClose={() => setIsSidebarOpen(false)}
            onSidebarClick={handleSidebarClick}
          />
        </div>
        
        {/* Contenido Principal de la Página */}
        <main className="flex-1 flex flex-col items-center p-4 md:p-8 bg-gray-900 text-white font-sans md:ml-20 pt-16">
          <HeroSection />
          
          <AnimatedMessage messages={[
              "Mi primer objetivo es aliviar ese estrés mental que nunca termina: contar los días para cobrar y sufrir por los números que no dan.",
              "Pero quiero que sepas algo: no es tu culpa. El desorden se alimenta de la falta de claridad, y nuestro primer paso juntos será encender la luz.",
              "No te voy a pedir cosas imposibles, solo que me cuentes tus gastos. Juntos, haremos un mapa real de tu dinero.",
              "Porque la tranquilidad no nace de tener más plata, nace de saber dónde estás parado. Ese es el poder que te quiero devolver.",
              "La paz mental de saber que, paso a paso, estás construyendo el control sobre tu futuro."
          ]} finalMessage="¡Bienvenido al cambio!" />

          {/* Módulo de Onboarding / Primeros Pasos */}
          <div id="primeros-pasos" className="mt-12 w-full max-w-4xl scroll-mt-20">
            <Accordion 
              id="primeros-pasos"
              title="Primeros Pasos" 
              isOpen={openAccordionId === 'primeros-pasos'}
              onToggle={() => handleAccordionToggle('primeros-pasos')}
            >
              <OnboardingFlow 
                  onboardingCompleted={hasCompletedOnboarding}
                  onboardingCompleteHandler={handleOnboardingComplete}
              />
            </Accordion>
          </div>

          {/* Módulo Financiero */}
          <div id="mis-finanzas" className="mt-12 w-full max-w-4xl scroll-mt-20">
            <Accordion 
              id="mis-finanzas"
              title="Módulo 1: Tu Centro de Comando Financiero"
              isOpen={openAccordionId === 'mis-finanzas'}
              onToggle={() => handleAccordionToggle('mis-finanzas')}
            >
              {session && !hasCompletedOnboarding && !isLoading ? (
                <div className="p-6 text-center text-yellow-300 bg-yellow-900/20 rounded-lg">
                  <p>Por favor, completá los "Primeros Pasos" para activar este módulo.</p>
                </div>
              ) : (
                // Aquí ocurre la magia: Le pasamos la función "puente" al Módulo Financiero.
                <FinanceModule onDataLoaded={handleFinancialDataLoaded} />
              )}
            </Accordion>
          </div>

          {/* Módulo de Cultivo */}
          <div id="modulo-cultivo" className="mt-12 w-full max-w-4xl scroll-mt-20">
            <Accordion 
              id="modulo-cultivo"
              title={moduleTitle}
              isOpen={openAccordionId === 'modulo-cultivo'}
              onToggle={() => handleAccordionToggle('modulo-cultivo')}
            >
              <div className="text-center mb-6">
                  <div className="inline-flex rounded-md shadow-sm bg-gray-900" role="group">
                      <button 
                          onClick={() => setSelectedGardeningMethod('hydroponics')}
                          className={`px-6 py-2 text-sm font-medium rounded-l-lg border border-gray-600 transition-colors duration-200 ${selectedGardeningMethod === 'hydroponics' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                          Hidroponía
                      </button>
                      <button 
                          onClick={() => setSelectedGardeningMethod('organic')}
                          className={`px-6 py-2 text-sm font-medium rounded-r-lg border border-gray-600 transition-colors duration-200 ${selectedGardeningMethod === 'organic' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                          Cultivo Orgánico
                      </button>
                  </div>
              </div>
              {/* Y aquí le pasamos los datos compartidos al Módulo de Cultivo. */}
              <CultivationModule 
                key={selectedGardeningMethod} 
                initialMethod={selectedGardeningMethod} 
                userFinancialData={sharedFinancialData}
              />
            </Accordion>
          </div>

          {/* +++ COMIENZA EL NUEVO CÓDIGO A AGREGAR +++ */}
          {/* Módulo de Planificación Familiar */}
          <div id="modulo-familia" className="mt-12 w-full max-w-4xl scroll-mt-20">
            <Accordion 
              id="modulo-familia"
              title="Módulo 3: IA de Planificación Familiar"
              isOpen={openAccordionId === 'modulo-familia'}
              onToggle={() => handleAccordionToggle('modulo-familia')}
            >
              <FamilyPlannerModule />
            </Accordion>
          </div>
          {/* +++ TERMINA EL NUEVO CÓDIGO A AGREGAR +++ */}

          {/* Botones Flotantes */}
          <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-4">
            <VoiceChat />
            <FloatingActionButton onClick={() => setIsModalOpen(true)} />
          </div>

          {/* Modal para Registrar Gastos */}
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Gasto">
            <AddExpenseForm onExpenseAdded={handleExpenseAdded} />
          </Modal>

        </main>
      </div>
    </>
  );
}