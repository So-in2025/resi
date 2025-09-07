// En: frontend/src/components/AddExpenseForm.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import MicRecorder from 'mic-recorder-to-mp3';
import apiClient from '@/lib/apiClient';

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

  const recorder = useRef<any>(null);

  useEffect(() => {
      // Inicializamos el recorder en el lado del cliente para evitar errores
      recorder.current = new MicRecorder({ bitRate: 128 });
      if (initialText) {
          setTextInput(initialText);
      }
  }, [initialText]);

  const startRecording = () => {
    if (!session) {
        setFeedback('Inicia sesión para grabar un gasto.');
        return;
    }
    if (recorder.current) {
        recorder.current.start().then(() => {
          setIsRecording(true);
          setFeedback('Grabando... Presiona de nuevo para detener.');
        }).catch((e: any) => {
            console.error("Error al iniciar grabación:", e)
            toast.error("No se pudo iniciar la grabación. Revisa los permisos del micrófono.")
        });
    }
  };

  const stopRecording = () => {
    if (!recorder.current) return;

    recorder.current.stop().getMp3().then(async ([buffer, blob]: [number[], Blob]) => {
      setIsRecording(false);
      setIsLoading(true);
      setFeedback('Procesando audio...');
      
      if (!session?.user?.email) {
          setFeedback("Error: No se encontró email de usuario en la sesión.");
          setIsLoading(false);
          return;
      }

      const audioFile = new File([blob], "audio.mp3", { type: blob.type });
      const formData = new FormData();
      formData.append("audio_file", audioFile);

      try {
        const response = await apiClient.post('/transcribe', formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${session.user.email}`
          }
        });
        handleResponse(response.data);
      } catch (error) {
        handleError(error);
      } finally {
        setIsLoading(false);
      }
    }).catch((e: any) => {
        console.error("Error al detener la grabación:", e)
        toast.error("Hubo un problema al procesar el audio.")
        setIsRecording(false);
    });
  };
  
  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() === '' || !session?.user?.email) return;

    setIsLoading(true);
    setFeedback('Registrando gasto...');

    try {
      const response = await apiClient.post('/process-text', 
        { text: textInput },
        { headers: { 'Authorization': `Bearer ${session.user.email}` } }
      );
      handleResponse(response.data);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = (data: any) => {
    if (data?.status?.includes("éxito")) {
      const d = data.data;
      setFeedback(`Registrado: $${d.amount} en ${d.category}`);
      setTimeout(() => { onExpenseAdded(); }, 1500); // Llama al padre para refrescar
    } else if (data?.data?.description) {
      setFeedback(`Respuesta: ${data.data.description}`);
      setTextInput('');
    } else {
      setFeedback('Respuesta inesperada del servidor.');
    }
  };

  const handleError = (error: any) => {
    console.error("Error en la petición:", error);
    const errorMsg = "Hubo un error al procesar la solicitud.";
    setFeedback(errorMsg);
    toast.error(errorMsg);
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