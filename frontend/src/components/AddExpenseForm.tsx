'use client';

import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import axios from 'axios';
import MicRecorder from 'mic-recorder-to-mp3';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

// Define a simple type for the MicRecorder instance.
// This tells TypeScript what methods and properties the class instance will have.
interface MicRecorderInstance {
  start: () => Promise<void>;
  stop: () => { getMp3: () => Promise<[number[], Blob]>; };
}

interface AddExpenseFormProps {
  onExpenseAdded: () => void;
}

export default function AddExpenseForm({ onExpenseAdded }: AddExpenseFormProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [feedback, setFeedback] = useState('');

  // The useRef hook now correctly holds a MicRecorder instance or null.
  const recorder = useRef<MicRecorderInstance | null>(null);

  const startRecording = () => {
    if (!session) {
      setFeedback('Inicia sesión para grabar un gasto.');
      return;
    }
    // Correctly create a new instance and assign it to the ref's current property.
    recorder.current = new MicRecorder({ bitRate: 128 });
    
    // Check if the instance exists before calling methods on it.
    if (recorder.current) {
        recorder.current.start().then(() => {
          setIsRecording(true);
          setFeedback('Grabando... Presiona de nuevo para detener.');
        }).catch((e: Error) => console.error(e));
    }
  };

  const stopRecording = () => {
    // Check if the instance exists before calling methods on it.
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
        const response = await axios.post('http://localhost:8000/transcribe', formData, {
          headers: { 
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${session.user.email}`
          }
        });
        handleResponse(response.data);
      } catch (error: any) {
        handleError(error);
      } finally {
        setIsLoading(false);
      }
    }).catch((e: Error) => console.error(e));
  };
  
  const handleTextSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (textInput.trim() === '') return;

    setIsLoading(true);
    setFeedback('Registrando gasto...');

    if (!session?.user?.email) {
      setFeedback("Error: No se encontró email de usuario en la sesión.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:8000/process-text', 
        { text: textInput },
        { headers: { 'Authorization': `Bearer ${session.user.email}` } }
      );
      handleResponse(response.data);
    } catch (error: any) {
      handleError(error);
    } finally {
      setIsLoading(false);
      setTextInput('');
    }
  };

  const handleResponse = (data: any) => {
    let success = false;
    if (data?.status?.includes("éxito") && data?.data?.amount) {
      const d = data.data;
      setFeedback(`Registrado: $${d.amount} en ${d.category}`);
      success = true;
    } else if (data?.error) {
      setFeedback(`Error: ${data.error}`);
    } else if (data?.data?.description) {
      setFeedback(`Respuesta: ${data.data.description}`);
    } else {
      setFeedback('Respuesta inesperada del servidor.');
    }

    if (success) {
      setTimeout(() => {
        onExpenseAdded();
      }, 1500);
    }
  };

  const handleError = (error: any) => {
    console.error("Error en la petición:", error);
    setFeedback("Hubo un error al procesar la solicitud.");
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-center">Toma el control de tu dinero, sin esfuerzo.</h3>
      
      <div className="flex flex-col items-center">
        <p className="text-gray-400 mb-2">Presiona y háblale a Resi</p>
        <button 
          onClick={isRecording ? stopRecording : startRecording} 
          className={`px-6 py-3 rounded-full font-bold text-white transition-colors text-3xl w-24 h-24 flex items-center justify-center ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
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
          onChange={(e: ChangeEvent<HTMLInputElement>) => setTextInput(e.target.value)}
          placeholder="Ej: 5000 pesos en el supermercado"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          disabled={isLoading || !session}
        />
        <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold" disabled={isLoading || !session}>
          Registrar
        </button>
      </form>
    </div>
  );
}