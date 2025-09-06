'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import FloatingActionButton from '@/components/FloatingActionButton';
import Modal from '@/components/Modal';
import AddExpenseForm from '@/components/AddExpenseForm';
import Accordion from "@/components/Accordion";
import OnboardingFlow from "@/components/OnboardingFlow";
import AnimatedMessage from "@/components/AnimatedMessage";
import CultivationModule from "@/components/CultivationModule";

// Componente HeroSection
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

// Aquí se corrige el error de "unescaped entities"
const AnimatedMessageComponent = ({ messages, finalMessage }: { messages: string[], finalMessage: string }) => {
    const [index, setIndex] = useState(0);
    const [showFinalMessage, setShowFinalMessage] = useState(false);

    useEffect(() => {
        if (showFinalMessage) return;
        const timer = setTimeout(() => {
            if (index === messages.length - 1) {
                setShowFinalMessage(true);
            }
            setIndex((prevIndex) => (prevIndex + 1) % messages.length);
        }, 6000);
        return () => clearTimeout(timer);
    }, [index, messages.length, showFinalMessage]);

    const renderMessageContent = (msgIndex: number) => {
        const message = messages[msgIndex];
        return (
            <p className="text-xl md:text-2xl text-gray-200 leading-relaxed italic">
                {message.replace(/Ese estrés es agotador\. Y te está quitando la vida\./g, '<strong className="text-red-400">Ese estrés es agotador. Y te está quitando la vida.</strong>')
                        .replace(/no es tu culpa\./g, '<strong className="text-white">no es tu culpa.</strong>')
                        .replace(/encender la luz\./g, '<span className="text-green-400 font-semibold">encender la luz.</span>')
                        .replace(/mapa real de tu dinero\./g, '<strong className="text-white">mapa real de tu dinero.</strong>')
                        .replace(/saber dónde estás parado\./g, '<strong className="text-white">saber dónde estás parado.</strong>')}
            </p>
        );
    };

    return (
        <div className="w-full max-w-3xl h-48 md:h-40 flex items-center justify-center p-6 bg-gray-800 rounded-lg shadow-xl text-center">
            {showFinalMessage ? (
                <p className="text-4xl lg:text-5xl font-extrabold leading-tight">
                    {finalMessage}
                </p>
            ) : (
                <div dangerouslySetInnerHTML={{ __html: renderMessageContent(index) }} />
            )}
        </div>
    );
};


export default function HomePage() {
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openAccordionId, setOpenAccordionId] = useState<string | null>('mis-finanzas');
  const [selectedGardeningMethod, setSelectedGardeningMethod] = useState('hydroponics');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [refreshHeader, setRefreshHeader] = useState(0);

  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      if (status === 'authenticated' && session?.user?.email) {
        try {
          const response = await axios.get(`http://localhost:8000/dashboard-summary`, {
            headers: { 'Authorization': `Bearer ${session.user.email}` }
          });
          setHasCompletedOnboarding(response.data.has_completed_onboarding);
        } catch (error) {
          console.error("Error al obtener el estado de onboarding:", error);
          setHasCompletedOnboarding(false);
        }
      } else {
        setHasCompletedOnboarding(false);
      }
    };
    fetchOnboardingStatus();
  }, [status, session]);

  const handleExpenseAdded = () => {
    setIsModalOpen(false);
  };

  const handleAccordionToggle = (id: string) => {
    setOpenAccordionId(openAccordionId === id ? null : id);
  };
  
  const handleSidebarClick = (id: string) => {
    if (openAccordionId === id) {
      return;
    }
    setOpenAccordionId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    setOpenAccordionId(null);
    setRefreshHeader(prev => prev + 1);
  };

  const moduleTitle = `Módulo 2: Tu ${selectedGardeningMethod === 'hydroponics' ? 'Sistema Hidropónico' : 'Huerto Orgánico'}`;
  
  return (
    <>
      <Header refreshTrigger={refreshHeader} />
      <div className="flex">
        <div className="fixed top-0 left-0 h-screen md:pt-16">
          <Sidebar 
            isOpen={isSidebarOpen} 
            onOpen={() => setIsSidebarOpen(true)} 
            onClose={() => setIsSidebarOpen(false)}
            onSidebarClick={handleSidebarClick}
          />
        </div>
        
        <main className="flex-1 flex flex-col items-center p-8 bg-gray-900 text-white font-sans md:ml-20 pt-16">
          <HeroSection />
          
          <AnimatedMessageComponent messages={[
              "Mi primer objetivo es aliviar ese estrés mental que nunca termina: contar los días para cobrar y sufrir por los números que no dan.",
              "Pero quiero que sepas algo: no es tu culpa. El desorden se alimenta de la falta de claridad, y nuestro primer paso juntos será encender la luz.",
              "No te voy a pedir cosas imposibles, solo que me cuentes tus gastos. Juntos, haremos un mapa real de tu dinero.",
              "Porque la tranquilidad no nace de tener más plata, nace de saber dónde estás parado. Ese es el poder que te quiero devolver.",
              "La paz mental de saber que, paso a paso, estás construyendo el control sobre tu futuro."
          ]} finalMessage="¡Bienvenido al cambio!" />

          <div id="mis-finanzas" className="mt-12 w-full max-w-4xl scroll-mt-32">
            <SectionHeader
              title="Módulo 1: Primeros Pasos"
              subtitle="Establece tu presupuesto inicial."
            />
            <Accordion 
              id="mis-finanzas"
              title="Primeros Pasos" 
              isOpen={openAccordionId === 'mis-finanzas'}
              onToggle={() => handleAccordionToggle('mis-finanzas')}
            >
              <OnboardingFlow 
                  onboardingCompleted={hasCompletedOnboarding}
                  onboardingCompleteHandler={handleOnboardingComplete}
              />
            </Accordion>
          </div>
          
          <div id="modulo-cultivo" className="mt-12 w-full max-w-4xl scroll-mt-32">
            <SectionHeader
              title={moduleTitle}
              subtitle="Elige tu método de cultivo para sembrar tu futuro."
            />
            <Accordion 
              id="modulo-cultivo"
              title={moduleTitle}
              isOpen={openAccordionId === 'modulo-cultivo'}
              onToggle={() => handleAccordionToggle('modulo-cultivo')}
            >
              <div className="text-center mb-4">
                  <div className="flex justify-center space-x-4">
                      <button 
                          onClick={() => setSelectedGardeningMethod('hydroponics')}
                          className={`px-6 py-2 rounded-md font-bold transition-colors duration-200
                              ${selectedGardeningMethod === 'hydroponics' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                          Hidroponía
                      </button>
                      <button 
                          onClick={() => setSelectedGardeningMethod('organic')}
                          className={`px-6 py-2 rounded-md font-bold transition-colors duration-200
                              ${selectedGardeningMethod === 'organic' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                          Cultivo Orgánico
                      </button>
                  </div>
              </div>
              {selectedGardeningMethod === 'hydroponics' ? (
                  <CultivationModule initialMethod="hydroponics" userFinancialData={{ supermarketSpending: 1000 }} />
              ) : (
                  <CultivationModule initialMethod="organic" userFinancialData={{ supermarketSpending: 1000 }} />
              )}
            </Accordion>
          </div>

          <div className="fixed bottom-4 right-4 z-50">
            <FloatingActionButton onClick={() => setIsModalOpen(true)} />
          </div>

          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Gasto">
            <AddExpenseForm onExpenseAdded={handleExpenseAdded} />
          </Modal>

        </main>
      </div>
    </>
  );
}