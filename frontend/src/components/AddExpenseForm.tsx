// En: frontend/src/components/AddExpenseForm.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/apiClient';

// --- Funciones auxiliares para crear un archivo WAV ---
const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
};

const encodeWAV = (samples: Float32Array, sampleRate: number): Blob => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);

  return new Blob([view], { type: 'audio/wav' });
};


interface AddExpenseFormProps {
  onExpenseAdded: () => void;
  initialText?: string;
}

export default function AddExpenseForm({ onExpenseAdded, initialText }: AddExpenseFormProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [feedback, setFeedback] = useState('');

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (initialText) {
      setTextInput(initialText);
    }
  }, [initialText]);

  const startRecording = async () => {
    if (!session) {
      setFeedback('Inicia sesión para grabar un gasto.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = (event) => audioChunks.current.push(event.data);
      mediaRecorder.current.onstop = processAudio; // Llamamos a nuestra nueva función de procesamiento
      audioChunks.current = [];
      mediaRecorder.current.start();
      setIsRecording(true);
      setFeedback('Grabando... Presiona de nuevo para detener.');
    } catch (error) {
      console.error("Error al acceder al micrófono:", error);
      toast.error("No se pudo acceder al micrófono. Revisa los permisos en tu navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setFeedback('Procesando audio...');
    }
  };

  const processAudio = async () => {
    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });

    // Aquí ocurre la magia: convertimos el WEBM a WAV en el navegador
    const audioContext = new AudioContext({ sampleRate: 44100 });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const wavBlob = encodeWAV(audioBuffer.getChannelData(0), audioBuffer.sampleRate);
    
    handleSendAudio(wavBlob);
  };

  const handleSendAudio = async (wavBlob: Blob) => {
    if (!session?.user?.email) return;
    const toastId = toast.loading("Enviando a Resi...");
    setIsLoading(true);

    const formData = new FormData();
    formData.append('audio_file', wavBlob, 'gasto.wav'); // Ahora enviamos un .wav

    try {
      const response = await apiClient.post('/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${session.user.email}` },
      });
      handleResponse(response.data);
      toast.success("¡Gasto registrado!", { id: toastId });
    } catch (error) {
      handleError(error);
      toast.error("No se pudo registrar el gasto.", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTextSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (textInput.trim() === '' || !session?.user?.email) return;
      
      const toastId = toast.loading("Registrando gasto...");
      setIsLoading(true);
      setFeedback('Registrando gasto...');
      try {
        const response = await apiClient.post('/process-text', 
          { text: textInput },
          { headers: { 'Authorization': `Bearer ${session.user.email}` } }
        );
        handleResponse(response.data);
        toast.success("¡Gasto registrado!", { id: toastId });
      } catch (error) {
        handleError(error);
        toast.error("No se pudo registrar el gasto.", { id: toastId });
      } finally {
        setIsLoading(false);
      }
    };

    const handleResponse = (data: any) => {
      if (data?.status?.includes("éxito")) {
        const d = data.data;
        setFeedback(`Registrado: $${d.amount} en ${d.category}`);
        setTimeout(() => { onExpenseAdded(); }, 1500);
      } else if (data?.data?.description) {
        setFeedback(`Respuesta: ${data.data.description}`);
        setTextInput(data.data.description);
      } else {
        setFeedback('Respuesta inesperada del servidor.');
      }
    };

    const handleError = (error: any) => {
      console.error("Error en la petición:", error);
      const errorMsg = "Hubo un error al procesar la solicitud.";
      setFeedback(errorMsg);
    };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-center text-white">Toma el control de tu dinero, sin esfuerzo.</h3>
      
      <div className="flex flex-col items-center">
        <p className="text-gray-400 mb-2">Presiona y háblale a Resi</p>
        <button 
          type="button"
          onClick={isRecording ? stopRecording : startRecording} 
          className={`px-6 py-3 rounded-full font-bold text-white transition-transform transform hover:scale-105 text-3xl w-24 h-24 flex items-center justify-center ${isRecording ? 'bg-red-600 animate-pulse' : 'bg-blue-600'}`}
          disabled={isLoading || !session}
        >
          {isRecording ? '■' : '🎙️'}
        </button>
        <p className="mt-2 text-sm text-gray-400 h-4">{feedback || (!session ? 'Inicia sesión para registrar un gasto' : '')}</p>
      </div>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-gray-600"></div>
        <span className="flex-shrink mx-4 text-gray-400">O usa texto</span>
        <div className="flex-grow border-t border-gray-600"></div>
      </div>

      <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Ej: 5000 pesos en el supermercado"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
          disabled={isLoading || !session}
        />
        <button 
            type="submit" 
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-white disabled:opacity-50" 
            disabled={isLoading || !session || !textInput.trim()}>
          Registrar
        </button>
      </form>
    </div>
  );
}