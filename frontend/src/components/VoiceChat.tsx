// En: frontend/src/components/VoiceChat.tsx

'use client';

import { useState } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';

const VoiceChat = () => {
  const [isListening, setIsListening] = useState(false);

  const handleMicClick = () => {
    setIsListening(!isListening);
    // Lógica para iniciar o detener la escucha de voz
    if (!isListening) {
      console.log("Iniciando escucha de voz...");
      // Aquí iría la API de reconocimiento de voz
    } else {
      console.log("Deteniendo escucha de voz.");
    }
  };

  return (
    <button
      onClick={handleMicClick}
      className={`relative w-16 h-16 rounded-full shadow-lg flex items-center justify-center transition-transform transform hover:scale-110 ${
        isListening ? 'bg-red-500' : 'bg-green-500'
      }`}
    >
      {isListening ? (
        <FaStop size={24} className="text-white" />
      ) : (
        <FaMicrophone size={24} className="text-white" />
      )}
      {isListening && (
        <span className="absolute animate-ping w-full h-full rounded-full bg-red-400 opacity-75"></span>
      )}
    </button>
  );
};

export default VoiceChat;