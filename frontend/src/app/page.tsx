// En: frontend/src/app/page.tsx
'use client';

import Accordion from "@/components/Accordion";
import AnimatedMessage from "@/components/AnimatedMessage";
import FloatingActionButton from "@/components/FloatingActionButton";
import Modal from "@/components/Modal";
import AddExpenseForm from "@/components/AddExpenseForm";
import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import CultivationModule from "@/components/CultivationModule";
import OnboardingFlow from "@/components/OnboardingFlow";
import Header from "@/components/Header";
import FinanceModule from '@/components/FinanceModule'; 
import FamilyPlannerModule from "@/components/FamilyPlannerModule";
import apiClient from "@/lib/apiClient";
import dynamic from 'next/dynamic';
import { ChatWindow, ChatMessage } from "@/components/ChatWindow";
import { FaComments } from "react-icons/fa";
import toast from 'react-hot-toast';

const VoiceChatDinamic = dynamic(() => import('@/components/VoiceChat'), {
  ssr: false, 
  loading: () => <div className="w-16 h-16 rounded-full bg-gray-700 animate-pulse" /> 
});

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

export default function HomePage() {
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialExpenseText, setInitialExpenseText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);
  const [selectedGardeningMethod, setSelectedGardeningMethod] = useState('hydroponics');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sharedFinancialData, setSharedFinancialData] = useState<{ supermarketSpending: number } | null>(null);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (session?.user?.email) {
        try {
          const response = await apiClient.get('/check-onboarding', {
            headers: { 'Authorization': `Bearer ${session.user.email}` },
          });
          const completed = response.data.onboarding_completed;
          setHasCompletedOnboarding(completed);
          if (completed) {
            setOpenAccordionId('mis-finanzas');
          } else {
            setOpenAccordionId('primeros-pasos');
          }
        } catch (error) {
          console.error("Error al chequear el estado de onboarding:", error);
          setOpenAccordionId('primeros-pasos');
        }
      } else {
        setOpenAccordionId('primeros-pasos');
      }
      setIsLoading(false);
    };

    if (status === 'authenticated') {
      checkOnboardingStatus();
    } else if (status === 'unauthenticated') {
      setHasCompletedOnboarding(false);
      setIsLoading(false);
      setOpenAccordionId('primeros-pasos');
    }
  }, [session, status]);

  useEffect(() => {
    const fetchChatHistory = async () => {
        if (isChatOpen && session?.user?.email) {
            try {
                const response = await apiClient.get('/chat/history', {
                    headers: { 'Authorization': `Bearer ${session.user.email}` }
                });
                const history = response.data.map((msg: any) => ({
                    sender: msg.sender,
                    text: msg.message,
                }));

                if (history.length > 0) {
                    setChatMessages(history);
                } else {
                    setChatMessages([
                        { sender: 'ai', text: '¡Hola! Soy Resi. ¿En qué te puedo ayudar hoy?' },
                        { sender: 'ai', text: 'Podés tocar mis mensajes para escucharlos en voz alta.', isInfo: true }
                    ]);
                }
            } catch (error) {
                console.error("Error al cargar el historial del chat:", error);
                toast.error("No se pudo cargar el historial del chat.");
            }
        }
    };

    fetchChatHistory();
  }, [isChatOpen, session]);

  const handleSendMessage = async (text: string) => {
    if (!session?.user?.email) {
      toast.error("Debes iniciar sesión para chatear con Resi.");
      return;
    }

    const userMessage: ChatMessage = { sender: 'user', text };
    setChatMessages(prev => [...prev, userMessage]);

    try {
      const response = await apiClient.post<{ response: string }>('/chat', { question: text }, {
        headers: { 'Authorization': `Bearer ${session.user.email}` }
      });
      const aiMessage: ChatMessage = { sender: 'ai', text: response.data.response };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error en el chat con IA:", error);
      const errorMsg: ChatMessage = { sender: 'ai', text: "Disculpá, tuve un problema para procesar tu pregunta." };
      setChatMessages(prev => [...prev, errorMsg]);
    }
  };

  const handleExpenseAdded = () => {
    setIsModalOpen(false);
    setInitialExpenseText('');
    setDataRefreshKey(prevKey => prevKey + 1);
  };

  const handleAccordionToggle = (id: string) => {
    setOpenAccordionId(openAccordionId === id ? null : id);
  };
  
  const handleSidebarClick = (id: string) => {
    setOpenAccordionId(id);
  };
  
  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
    setOpenAccordionId('mis-finanzas');
  };

  const handleFinancialDataLoaded = useCallback((data: { supermarketSpending: number }) => {
    setSharedFinancialData(data);
  }, []);

  const moduleTitle = `Módulo 2: Tu ${selectedGardeningMethod === 'hydroponics' ? 'Sistema Hidropónico' : 'Huerto Orgánico'}`;
  
  return (
    <>
      <Header refreshTrigger={dataRefreshKey} />
      <div className="flex bg-gray-900">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onOpen={() => setIsSidebarOpen(true)} 
          onClose={() => setIsSidebarOpen(false)}
          onSidebarClick={handleSidebarClick}
        />
        
        <main className="flex-1 flex flex-col items-center p-4 md:p-8 text-white font-sans md:ml-20 pt-20">
          <HeroSection />
          
          <AnimatedMessage messages={[
              "Mi primer objetivo es aliviar ese estrés mental que nunca termina: contar los días para cobrar y sufrir por los números que no dan.",
              "Pero quiero que sepas algo: no es tu culpa. El desorden se alimenta de la falta de claridad, y nuestro primer paso juntos será encender la luz.",
              "No te voy a pedir cosas imposibles, solo que me cuentes tus gastos. Juntos, haremos un mapa real de tu dinero.",
              "Porque la tranquilidad no nace de tener más plata, nace de saber dónde estás parado. Ese es el poder que te quiero devolver.",
              "La paz mental de saber que, paso a paso, estás construyendo el control sobre tu futuro."
          ]} finalMessage="¡Bienvenido al cambio!" />

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
                <FinanceModule 
                  key={dataRefreshKey} 
                  onDataLoaded={handleFinancialDataLoaded}
                  isOpen={openAccordionId === 'mis-finanzas'}
                />
              )}
            </Accordion>
          </div>

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
              <CultivationModule 
                key={selectedGardeningMethod} 
                initialMethod={selectedGardeningMethod} 
                userFinancialData={sharedFinancialData}
              />
            </Accordion>
          </div>
          
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

          <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-4">
            <button
              onClick={() => setIsChatOpen(true)}
              className="bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform transform hover:scale-110"
              aria-label="Abrir chat con Resi"
            >
              <FaComments size={24} />
            </button>
            <FloatingActionButton onClick={() => setIsModalOpen(true)} />
          </div>

          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar Nuevo Gasto">
            <AddExpenseForm onExpenseAdded={handleExpenseAdded} initialText={initialExpenseText}/>
          </Modal>

          <ChatWindow
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
          />
        </main>
      </div>
    </>
  );
}