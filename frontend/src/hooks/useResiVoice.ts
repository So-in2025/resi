'use client';

import { useEffect, useCallback, useState } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import toast from 'react-hot-toast';

// TU LISTA COMPLETA DE CONSEJOS Y TRIVIAS (INTACTA)
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
  const array = [...consejos];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  shuffledConsejos = array;
  consejoIndex = 0;
};


export const useResiVoice = () => {
  const [responseToSpeak, setResponseToSpeak] = useState('');
  const [actionToPerform, setActionToPerform] = useState<{ type: string; payload?: any } | null>(null);
  // Nuevo estado para controlar si el saludo de bienvenida ya se ha dicho
  const [hasSpokenWelcome, setHasSpokenWelcome] = useState(false);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const googleSpanishVoices = voices.filter(voice => voice.lang.startsWith('es') && voice.name.includes('Google'));
      
      utterance.voice = googleSpanishVoices[1] || googleSpanishVoices[0] || voices.find(v => v.lang.startsWith('es')) || voices[0];
      
      if (utterance.voice) {
        utterance.lang = utterance.voice.lang;
        utterance.rate = 1.1;
        utterance.pitch = 1.2;
        window.speechSynthesis.speak(utterance);
      } else {
        console.error("No se encontró una voz de Google en español.");
      }
    };
    
    if (window.speechSynthesis.getVoices().length > 0) {
      setVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }
  }, []);

  const { transcript, finalTranscript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  const startListening = () => {
    if (browserSupportsSpeechRecognition) {
      // El saludo de bienvenida ahora se activa con la primera interacción del usuario.
      if (!hasSpokenWelcome) {
        const welcomeMessage = "Hola, soy Resi. Presioná de nuevo y decime un gasto para registrarlo, por ejemplo: 5000 pesos en nafta.";
        speak(welcomeMessage);
        setHasSpokenWelcome(true);
      }
      resetTranscript();
      SpeechRecognition.startListening({ continuous: false, language: 'es-AR' });
      toast('¡Te escucho!', { icon: '🎤', duration: 2000 });
    } else {
      toast.error('Tu navegador no soporta el reconocimiento de voz.');
    }
  };

  const stopListening = () => SpeechRecognition.stopListening();

  useEffect(() => {
    if (finalTranscript) {
      const command = finalTranscript.toLowerCase();
      // Lógica para interpretar el comando de voz del usuario
      if (command.includes("registrar") || command.includes("gasto") || command.includes("gasté")) {
        setActionToPerform({ type: 'OPEN_ADD_EXPENSE_MODAL_WITH_TEXT', payload: finalTranscript });
        speak('Entendido. Revisá los datos y guardá el gasto.');
      }
      resetTranscript();
    }
  }, [finalTranscript, resetTranscript, speak]);

  useEffect(() => {
    if (responseToSpeak) {
      speak(responseToSpeak);
      setResponseToSpeak('');
    }
  }, [responseToSpeak, speak]);

  // Lógica para las trivias (ahora funciona correctamente)
  useEffect(() => {
    shuffleConsejos();
    const tipInterval = setInterval(() => {
      // La trivia solo se activa si no estamos escuchando y si el saludo inicial ya se dio.
      if (!listening && hasSpokenWelcome) {
        if (consejoIndex >= shuffledConsejos.length) {
          shuffleConsejos();
        }
        speak(shuffledConsejos[consejoIndex]);
        consejoIndex++;
      }
    }, 45000); // 45 segundos

    // Función de limpieza para evitar que se acumulen timers.
    return () => {
      clearInterval(tipInterval);
      window.speechSynthesis.cancel();
    };
  }, [speak, listening, hasSpokenWelcome]);

  const clearAction = () => setActionToPerform(null);

  // ESTA ES LA PARTE QUE FALTABA
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