// En: frontend/src/hooks/useResiVoice.ts
'use client';

import { useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import toast from 'react-hot-toast';

// El hook ahora solo se encarga del reconocimiento de voz (escuchar)
export const useResiVoice = () => {
  const { 
    transcript: finalTranscript, // Renombramos para claridad, ya que solo nos importa el final
    listening, 
    resetTranscript, 
    browserSupportsSpeechRecognition 
  } = useSpeechRecognition();

  const startListening = useCallback(() => {
    if (browserSupportsSpeechRecognition) {
      resetTranscript();
      // Le pedimos que deje de escuchar automáticamente cuando el usuario hace una pausa
      SpeechRecognition.startListening({ continuous: false, language: 'es-AR' });
      toast('¡Te escucho!', { icon: '🎤', duration: 2000 });
    } else {
      toast.error('Tu navegador no soporta el reconocimiento de voz.');
    }
  }, [browserSupportsSpeechRecognition, resetTranscript]);

  const stopListening = () => SpeechRecognition.stopListening();

  return { 
    listening, 
    startListening, 
    stopListening, 
    browserSupportsSpeechRecognition, 
    transcript: finalTranscript // Exportamos el texto final
  };
};