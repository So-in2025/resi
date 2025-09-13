// En: frontend/src/app/page.tsx
'use client';

import Accordion from "@/components/Accordion";
import AnimatedMessage from "@/components/AnimatedMessage";
import FloatingActionButton from "@/components/FloatingActionButton";
import Modal from "@/components/Modal";
import AddExpenseForm from "@/components/AddExpenseForm";
import { useSession, signIn } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import CultivationModule from "@/components/CultivationModule";
import OnboardingFlow from "@/components/OnboardingFlow";
import Header from "@/components/Header";
import FinanceModule from '@/components/FinanceModule'; 
import FamilyPlannerModule from "@/components/FamilyPlannerModule";
import CommunityModule from "@/components/CommunityModule"; // Importamos el nuevo módulo
import apiClient from "@/lib/apiClient";
import dynamic from 'next/dynamic';
import { ChatWindow, ChatMessage } from "@/components/ChatWindow";
import { FaComments, FaClipboardList } from "react-icons/fa";
import toast from 'react-hot-toast';
import HeaderToggleButton from '@/components/HeaderToggleButton';
import { motion, AnimatePresence } from 'framer-motion';

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
      Llegá a fin de mes, tomá el control de tu dinero, sembrá tu futuro y el de los tuyos. Compra, Vende, Intercambia, Promociona, Comparti.
    </p>
  </div>
);

const UpdatesLogModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void; }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Historial de Actualizaciones">
    <div className="text-left text-gray-300 max-h-96 overflow-y-auto pr-4">
    {/* Sección: Visión General y Propuesta de Valor */}
    <div className="mb-6">
        <h3 className="text-xl font-semibold text-green-400 mb-2">Visión General: Construyendo Resiliencia</h3>
        <p className="text-gray-300">
            Resi es tu compañero digital para fortalecer tu economía y bienestar. Nuestra misión es simple: empoderarte con herramientas inteligentes y personalizadas que te ayuden a tomar el control de tu dinero, producir tus propios alimentos y planificar el futuro de tu familia. Lo hacemos a través de una experiencia de usuario única, potenciada por inteligencia artificial y una comunidad activa.
        </p>
    </div>

    {/* Sección: Hitos Clave de Desarrollo */}
    <div className="mb-6">
        <h3 className="text-xl font-semibold text-green-400 mb-2">Hitos del Proyecto: Un Camino en Crecimiento</h3>
        
        {/* Hito 1 */}
         <div className="mb-4 p-4 bg-green-900/50 border border-green-500 rounded-lg">
            <h4 className="font-semibold text-green-300">Fase 1: Asistencia a Medida</h4>
            <p className="text-gray-400">Creamos las bases para que Resi entienda tus necesidades de manera única.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 mt-2">
                <li><span className="font-semibold text-white">Perfil Inteligente:</span> Al iniciar, Resi te conoce a fondo con un proceso guiado que define tu perfil financiero y tus metas a largo plazo.</li>
                <li><span className="font-semibold text-white">Planificación Dinámica:</span> Desarrollamos herramientas para que planifiques tu presupuesto y tus metas de ahorro, siempre con la posibilidad de ajustar el rumbo.</li>
                <li><span className="font-semibold text-white">IA Personalizada:</span> El motor de inteligencia artificial fue diseñado para darte consejos que realmente se adapten a tu situación.</li>
            </ul>
        </div>

        {/* Hito 2 */}
         <div className="mb-4 p-4 bg-green-900/50 border border-green-500 rounded-lg">
            <h4 className="font-semibold text-green-300">Fase 2: Conexión con el Entorno</h4>
            <p className="text-gray-400">Integramos a Resi con el mundo real para que sus consejos sean siempre actuales.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 mt-2">
                <li><span className="font-semibold text-white">Datos en Tiempo Real:</span> Conectamos la plataforma a fuentes de información confiables para que Resi esté al tanto de la realidad económica.</li>
                <li><span className="font-semibold text-white">Análisis Contextual:</span> El chat con nuestra IA ahora combina tu información personal con los datos actuales para brindarte asistencia más precisa.</li>
            </ul>
        </div>

        {/* Hito 3 */}
         <div className="mb-4 p-4 bg-green-900/50 border border-green-500 rounded-lg">
            <h4 className="font-semibold text-green-300">Fase 3: Módulos de Crecimiento y Productividad</h4>
            <p className="text-gray-400">Ampliamos la plataforma para que Resi te acompañe en más aspectos de tu vida diaria.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400 mt-2">
                <li><span className="font-semibold text-white">Planificación Familiar:</span> Creación de un módulo completo que genera planes de comidas, ahorro y ocio, adaptados a la dinámica de tu hogar.</li>
                <li><span className="font-semibold text-white">Recetas Detalladas:</span> El planificador familiar ahora genera recetas con ingredientes, medidas e instrucciones detalladas, que se visualizan en un modal con scroll interno.</li>
                <li><span className="font-semibold text-white">Huerto Inteligente:</span> El módulo de cultivo fue potenciado con un calendario de tareas, un registro de cosechas y análisis de rendimiento para maximizar tu productividad.</li>
                <li><span className="font-semibold text-white">IA del Chat Mejorada:</span> El chat de Resi ahora usa de forma activa tus últimos planes de cultivo y familiares para darte consejos más personalizados.</li>
            </ul>
        </div>
        
        {/* Hito 4 */}
         <div className="mb-4 p-4 bg-green-900/50 border border-green-500 rounded-lg">
            <h4 className="font-semibold text-green-300">Fase 4: Creamos un sistema de recompensas para hacer del progreso un hábito motivador.</h4>
            <ul className="list-disc list-inside space-y-1 text-gray-400 mt-2">
                <li><span className="font-semibold text-white">Gamificación:</span> Implementamos un sistema de logros, puntos y monedas virtuales que te premia por cada paso que das.</li>
                <li><span className="font-semibold text-white">ResiScore:</span> Presentamos tu Índice de Resiliencia, un puntaje que mide tu evolución y te motiva a mejorar continuamente en tu camino a la estabilidad.</li>
            </ul>
        </div>

        {/* --- HITO 5 (NUEVO Y DETALLADO) --- */}
        <div className="mb-4 p-4 bg-green-900/50 border border-green-500 rounded-lg">
            <h4 className="font-semibold text-green-300">Fase 5: Hacia una Economía Circular Productiva (V5.0)</h4>
            <p className="text-gray-300">Transformamos a Resi en un ecosistema económico autosostenible, activando el verdadero potencial de la comunidad.</p>
            <ul className="list-disc list-inside space-y-1 text-gray-300 mt-2">
                <li><span className="font-semibold text-white">Billetera Resiliente:</span> Se implementó el Panel de Control del usuario, mostrando el saldo de Monedas Resilientes y el historial de transacciones.</li>
                <li><span className="font-semibold text-white">Mercado Transaccional:</span> El Módulo de Comunidad ahora incluye un mercado funcional con publicación de productos (con imágenes), precios en monedas y el flujo de compra segura con "Apretón de Manos Digital" (QR).</li>
                <li><span className="font-semibold text-white">Eventos Comunitarios:</span> Los usuarios ya pueden crear y anunciar sus propias ferias, talleres o puntos de trueque.</li>
                <li><span className="font-semibold text-white">Modelo Premium Activado:</span> La base para la suscripción está lista. Los usuarios gratuitos tienen límites que incentivan la conversión, y los Premium ya gozan de beneficios como publicaciones destacadas.</li>
            </ul>
        </div>
    </div>

    {/* Sección: Visión de Futuro y Monetización */}
    <div className="mb-6">
        <h3 className="text-xl font-semibold text-green-400 mb-2">Visión de Futuro: Crecimiento Sostenible</h3>
        <p className="text-gray-300">Con la economía interna ya funcional, nuestra estrategia de monetización se consolida. Los ingresos por suscripciones Premium y la futura compra de Monedas Resilientes asegurarán la gratuidad de las funciones esenciales y financiarán la expansión de la plataforma.</p>
        <ul className="list-disc list-inside space-y-1 text-gray-300 mt-2">
            <li><span className="font-semibold text-white">Próximo Paso - Pasarelas de Pago:</span> Integrar Mercado Pago para activar la compra real de suscripciones y monedas.</li>
            <li><span className="font-semibold text-white">Modelo de Licencias:</span> Ofreceremos a municipios, ONGs y bancos la posibilidad de usar Resi como su propio asistente comunitario.</li>
        </ul>
    </div>
</div>
</Modal>
);

export default function HomePage() {
  const { data: session, status } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdatesModalOpen, setIsUpdatesModalOpen] = useState(false);
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
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (session?.user?.email) {
        try {
          const response = await apiClient.get('/check-onboarding', {
            headers: { 'Authorization': `Bearer ${session.user.email}` },
          });
          const completed = response.data.onboarding_completed;
          setHasCompletedOnboarding(completed);
          if (!completed) {
            setOpenAccordionId('primeros-pasos');
          } else {
            setOpenAccordionId(null);
          }
        } catch (error) {
          console.error("Error al chequear el estado de onboarding:", error);
          setOpenAccordionId(null);
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
    setOpenAccordionId(null);
  };

  const handleFinancialDataLoaded = useCallback((data: { supermarketSpending: number }) => {
    setSharedFinancialData(data);
  }, []);

  const moduleTitle = `Módulo 2: Tu ${selectedGardeningMethod === 'hydroponics' ? 'Sistema de Cultivo' : 'Sistema de Cultivo'}`;
  
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
            <Header refreshTrigger={dataRefreshKey} />
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex bg-gray-900">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onOpen={() => setIsSidebarOpen(true)} 
          onClose={() => setIsSidebarOpen(false)}
          onSidebarClick={handleSidebarClick}
        />
        <main className={`flex-1 flex flex-col items-center p-4 md:p-8 text-white font-sans md:ml-20 overflow-x-hidden transition-all duration-300 ${isHeaderVisible ? 'pt-4' : 'pt-20'}`}>
        <HeroSection />

          <div className="flex flex-col sm:flex-row items-center gap-x-6 gap-y-3 mb-10 w-full max-w-4xl justify-center flex-wrap">
            <button
                onClick={() => setIsUpdatesModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-700/50 rounded-lg border border-gray-600 hover:bg-gray-600/50 transition-colors"
            >
                <FaClipboardList />
                Logs de Updates
            </button>
            <p className="text-sm text-gray-400">
                Desarrollado por <a href="https://websoin.netlify.app" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline font-semibold">SO-IN Soluciones Informáticas</a>
            </p>
             <a href="https://websoin.netlify.app/resi" target="_blank" rel="noopener noreferrer" className="text-sm text-green-400 hover:underline">
                Conocé más sobre Resi
             </a>
          </div>
          
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

          <div id="modulo-comunidad" className="mt-12 w-full max-w-4xl scroll-mt-20">
            <Accordion 
              id="modulo-comunidad"
              title="Módulo 4: Comunidad y Mercado Resiliente"
              isOpen={openAccordionId === 'modulo-comunidad'}
              onToggle={() => handleAccordionToggle('modulo-comunidad')}
            >
              <CommunityModule />
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

          <UpdatesLogModal isOpen={isUpdatesModalOpen} onClose={() => setIsUpdatesModalOpen(false)} />

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