// En: frontend/src/components/ChatWindow.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPaperPlane, FaTimes, FaVolumeUp } from 'react-icons/fa';
import { useResiVoice } from '@/hooks/useResiVoice';

// Definimos los tipos para los mensajes y las props
export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  isInfo?: boolean; // Nuevo: para mensajes informativos
}

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}

export const ChatWindow = ({ isOpen, onClose, messages, onSendMessage }: ChatWindowProps) => {
  const [inputText, setInputText] = useState('');
  const { transcript, listening, startListening, stopListening, browserSupportsSpeechRecognition } = useResiVoice();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- NUEVA LÓGICA DE VOZ PARA NARRACIÓN ---
  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancela cualquier narración anterior para empezar la nueva
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const googleSpanishVoice = voices.find(v => v.lang.startsWith('es') && v.name.includes('Google'));
    const nativeSpanishVoice = voices.find(v => v.lang.startsWith('es'));

    utterance.voice = googleSpanishVoice || nativeSpanishVoice || voices[0];
    utterance.lang = utterance.voice?.lang || 'es-AR';
    utterance.rate = 1.05;
    utterance.pitch = 1.1;

    window.speechSynthesis.speak(utterance);
  }, []);
  // --- FIN DE LA LÓGICA DE VOZ ---

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (transcript && !listening) {
      onSendMessage(transcript);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, listening]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleMicClick = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 w-11/12 max-w-md h-3/4 max-h-[600px] bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border border-gray-600">
      <div className="flex justify-between items-center p-4 bg-gray-900 rounded-t-lg">
        <h3 className="text-lg font-bold text-green-400">Chateá con Resi</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <FaTimes size={20} />
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
            <div 
              className={`px-4 py-2 rounded-lg max-w-xs break-words flex items-center gap-3 ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : msg.isInfo
                    ? 'bg-gray-600 text-gray-300 italic' // Estilo para mensaje informativo
                    : 'bg-gray-700 text-gray-200 cursor-pointer hover:bg-gray-600' // Estilo para mensaje de la IA
              }`}
              // Añadimos el onClick solo a los mensajes de la IA que no son informativos
              onClick={msg.sender === 'ai' && !msg.isInfo ? () => speak(msg.text) : undefined}
            >
              <span>{msg.text}</span>
              {/* Añadimos el ícono solo a los mensajes de la IA que se pueden narrar */}
              {msg.sender === 'ai' && !msg.isInfo && <FaVolumeUp className="text-gray-400 flex-shrink-0" />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-900 rounded-b-lg border-t border-gray-700 flex items-center gap-2">
        {browserSupportsSpeechRecognition && (
          <button
            onClick={handleMicClick}
            className={`w-12 h-10 flex-shrink-0 flex items-center justify-center rounded-lg ${listening ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}
          >
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"/></svg>
          </button>
        )}
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escribí o usá el micrófono..."
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button onClick={handleSend} className="w-12 h-10 flex-shrink-0 bg-blue-600 text-white rounded-lg flex items-center justify-center">
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};