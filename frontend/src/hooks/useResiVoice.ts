// En: frontend/src/hooks/useResiVoice.ts
'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import { useSession } from 'next-auth/react';

const consejos = [
  "Recordá registrar hasta el gasto más chiquito. ¡Esos son los que más suman a fin de mes!",
  "Una vez por semana, tomate 5 minutos para chusmear tu 'Historial'. Te va a sorprender lo que podés descubrir.",
  "¿Sabías que podés crear categorías personalizadas en el Planificador? ¡Hacé que la app se adapte a tu vida!",
  "La página de 'Análisis' te muestra gráficos de tus gastos. Es la mejor forma de ver a dónde se fue la plata de un solo vistazo.",
  "¿Sabías que la palabra 'salario' viene de la sal? En la antigua Roma, a los soldados se les pagaba con sal. ¡Era el verdadero oro blanco!",
  "¿Sabías que Los primeros banqueros de la historia fueron los Caballeros Templarios?. Usaban claves secretas para que pudieras depositar oro en un lugar y retirarlo en otro.",
  "¿Sabías que El símbolo de peso, '$', viene de las monedas de reales españoles?. Las dos columnas del escudo de España con una banda que las envolvía se simplificó hasta hoy.",
  "¿Sabías que La mayor parte del dinero del mundo no está impreso?, son solo números en computadoras. Se basa en un sistema de confianza.",
  "¿Sabías que El negocio de un banco es usar tu plata?. Un plazo fijo o un fondo de inversión es tu forma de participar de esa ganancia.",
  "Leé siempre la letra chica de un préstamo o tarjeta. El Costo Financiero Total o C,F,T es el número que realmente importa.",
  "¿Sabías que El interés compuesto es la fuerza más poderosa del universo?. A tu favor en una inversión, te hace crecer. En tu contra en una deuda, te puede ahogar.",
  "Nunca pagues el 'mínimo' de la tarjeta de crédito salvo una emergencia. Es la forma más cara de pedir plata prestada que existe.",
  "Regla de oro en el súper: comprá más en los bordes (frutas, verduras, carnes) y menos en las góndolas del medio. La comida de verdad no suele venir en cajas.",
  "¿Sabías que Si la lista de ingredientes de un paquete tiene más de 5 cosas o nombres que no podés pronunciar, probablemente es un ultraprocesado?.",
  "¿Sabías que Cocinar en casa es una doble inversión?: una en tu salud, y otra en tu bolsillo. Es un ahorro gigante a fin de mes.",
  "El próximo paso de tu resiliencia es cultivar algo vos. Imaginate no tener que comprar más lechuga. Ese es el verdadero control sobre tu comida.",
  "¿Sabías que La mejor forma de ahorrar en farmacia es invirtiendo en tu salud todos los días?: buena comida, ejercicio y descanso. La prevención es la inversión más rentable.",
  "Cuando te receten algo, preguntale siempre a tu médico si existe una alternativa genérica. Por ley, tienen el mismo principio activo y son más baratos.",
  "¿Sabías que Crear un hábito financiero es como ir al gimnasio?. Al principio cuesta, pero después de unas semanas, ¡los resultados te van a encantar!",
  "No te compares con los demás. Tu viaje financiero es único. Cada peso que ahorrás es una victoria para tu futuro.",
  "Antes de una compra grande, esperá 24 horas. Muchas veces, el impulso desaparece y te das cuenta de que no lo necesitabas tanto."
];

let shuffledConsejos: string[] = [];
let consejoIndex = 0;

const shuffleConsejos = () => {
  shuffledConsejos = [...consejos].sort(() => 0.5 - Math.random());
  consejoIndex = 0;
};

export const useResiVoice = () => {
  const { data: session } = useSession();
  const [actionToPerform, setActionToPerform] = useState<{ type: string; payload?: any } | null>(null);
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  // ---- NUEVO ESTADO PARA "ACTIVAR" EL AUDIO ----
  const [isSpeechPrimed, setIsSpeechPrimed] = useState(false);
  
  const tipIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const performSpeak = () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = (e) => {
        console.error("Error en SpeechSynthesis:", e);
        toast.error("Hubo un problema al generar la voz.");
        setSpeaking(false);
      };
      
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        console.error("No se encontraron voces en el navegador.");
        setSpeaking(false);
        return;
      }

      const googleSpanishVoice = voices.find(v => v.lang.startsWith('es') && v.name.includes('Google'));
      const nativeSpanishVoice = voices.find(v => v.lang.startsWith('es'));
      utterance.voice = googleSpanishVoice || nativeSpanishVoice || voices[0];
      
      console.log("Voz seleccionada:", utterance.voice.name);

      utterance.lang = utterance.voice?.lang || 'es-AR';
      utterance.rate = 1.1;
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = performSpeak;
    } else {
      performSpeak();
    }
  }, []);

  const { transcript, finalTranscript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  const startListening = useCallback(() => {
    // ---- LÓGICA DE "ACTIVACIÓN" ----
    if (!isSpeechPrimed) {
      const primerUtterance = new SpeechSynthesisUtterance('');
      primerUtterance.volume = 0; // Silencioso
      window.speechSynthesis.speak(primerUtterance);
      setIsSpeechPrimed(true);
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
    if (browserSupportsSpeechRecognition) {
      if (!hasSpokenWelcome) {
        const welcomeMessage = "Hola, soy Resi. ¿En qué te puedo ayudar?";
        speak(welcomeMessage);
        setHasSpokenWelcome(true);
      }
      resetTranscript();
      SpeechRecognition.startListening({ continuous: false, language: 'es-AR' });
      toast('¡Te escucho!', { icon: '🎤', duration: 2000 });
    } else {
      toast.error('Tu navegador no soporta el reconocimiento de voz.');
    }
  }, [browserSupportsSpeechRecognition, hasSpokenWelcome, isSpeechPrimed, resetTranscript, speak, speaking]);

  const stopListening = () => SpeechRecognition.stopListening();

  useEffect(() => {
    const handleCommand = async (command: string) => {
      resetTranscript();
      if (!command || !session?.user?.email) return;

      const lowerCaseCommand = command.toLowerCase();

      if (lowerCaseCommand.includes("registrar") || lowerCaseCommand.includes("gasté") || lowerCaseCommand.includes("anotá")) {
        setActionToPerform({ type: 'OPEN_ADD_EXPENSE_MODAL_WITH_TEXT', payload: command });
        speak('Entendido. Revisá los datos y guardá el gasto.');
      } else {
        const toastId = toast.loading("Resi está pensando...");
        try {
          const response = await apiClient.post<{ response: string }>('/chat', { question: command }, {
            headers: { 'Authorization': `Bearer ${session.user.email}` }
          });
          speak(response.data.response);
          toast.dismiss(toastId);
        } catch (error) {
          console.error("Error en el chat con IA:", error);
          speak("Disculpa, tuve un problema para procesar tu pregunta.");
          toast.error("No pude procesar tu pregunta.", { id: toastId });
        }
      }
    };
    
    if (finalTranscript) {
      handleCommand(finalTranscript);
    }
  }, [finalTranscript, resetTranscript, speak, session]);

  useEffect(() => {
    shuffleConsejos();
    const startInterval = () => {
        if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
        tipIntervalRef.current = setInterval(() => {
            if (!listening && !speaking && hasSpokenWelcome) {
                if (consejoIndex >= shuffledConsejos.length) shuffleConsejos();
                speak(shuffledConsejos[consejoIndex]);
                consejoIndex++;
            }
        }, 45000);
    };
    
    if (hasSpokenWelcome) startInterval();
    
    return () => {
      if (tipIntervalRef.current) clearInterval(tipIntervalRef.current);
      window.speechSynthesis.cancel();
    };
  }, [speak, listening, speaking, hasSpokenWelcome]);

  const clearAction = () => setActionToPerform(null);

  return { 
    listening, 
    startListening, 
    stopListening, 
    browserSupportsSpeechRecognition, 
    actionToPerform,
    clearAction,
    transcript 
  };
};