// En: frontend/src/components/VoiceChat.tsx
'use client';

import { useResiVoice } from '@/hooks/useResiVoice';
import { FaMicrophone, FaStop } from 'react-icons/fa';

const VoiceChat = () => {
  // Usamos el hook centralizado que maneja toda la lógica de voz
  const { listening, startListening, stopListening, browserSupportsSpeechRecognition } = useResiVoice();

  const handleMicClick = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // No mostramos nada si el navegador no soporta la funcionalidad
  if (!browserSupportsSpeechRecognition) {
    return null;
  }

  return (
    <button
      onClick={handleMicClick}
      className={`relative w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-transform transform hover:scale-110 ${
        listening ? 'bg-red-500' : 'bg-green-500'
      }`}
      aria-label={listening ? 'Detener grabación' : 'Iniciar grabación'}
    >
      {listening ? (
        <FaStop size={24} className="text-white" />
      ) : (
        <FaMicrophone size={24} className="text-white" />
      )}
      {listening && (
        <span className="absolute animate-ping w-full h-full rounded-full bg-red-400 opacity-75"></span>
      )}
    </button>
  );
};

export default VoiceChat;