// En: frontend/src/components/AnimatedMessage.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Definimos las propiedades que nuestro componente recibirá
interface AnimatedMessageProps {
  messages: string[];
  finalMessage: string;
}

export default function AnimatedMessage({ messages, finalMessage }: AnimatedMessageProps) {
  const [index, setIndex] = useState(0);
  const [showFinalMessage, setShowFinalMessage] = useState(false);

  useEffect(() => {
    if (showFinalMessage) return;

    const timer = setTimeout(() => {
      if (index >= messages.length - 1) { 
        setShowFinalMessage(true); 
      }
      setIndex((prevIndex) => prevIndex + 1); 
    }, 6000);

    return () => clearTimeout(timer);
  }, [index, messages.length, showFinalMessage]);

  const renderMessageContent = (msgIndex: number) => {
    // Definimos el array de mensajes con el formato deseado.
    const formattedMessages = [
      'Mi primer objetivo es aliviar ese estrés mental que nunca termina: contar los días para cobrar y sufrir por los números que no dan.',
      'Pero quiero que sepas algo: <strong class="text-white">no es tu culpa.</strong> El desorden se alimenta de la falta de claridad, y nuestro primer paso juntos será <span class="text-green-400 font-semibold">encender la luz.</span>',
      'No te voy a pedir cosas imposibles, solo que me cuentes tus gastos. Juntos, haremos un <strong class="text-white">mapa real de tu dinero.</strong>',
      'Porque la tranquilidad no nace de tener más plata, nace de <strong class="text-white">saber dónde estás parado.</strong> Ese es el poder que te quiero devolver.',
      'La <strong class="text-white">paz mental</strong> de saber que, paso a paso, estás construyendo el control sobre tu futuro.'
    ];

    return formattedMessages[msgIndex];
  };

  const renderFinalMessageWithColors = (message: string) => {
    const words = message.split(' ');
    // Definimos los colores para las palabras, imitando la bandera de Argentina
    const totalWords = words.length;
    const third = Math.floor(totalWords / 3);

    return words.map((word, i) => {
      let colorClass = 'text-blue-300';
      if (i >= third && i < totalWords - third) {
        colorClass = 'text-yellow-400';
      }
      return (
        <span key={i} className={colorClass}>
          {word}{i < totalWords - 1 ? ' ' : ''}
        </span>
      );
    });
  };

  return (
    <div className="w-full max-w-3xl h-48 md:h-40 flex items-center justify-center p-6 bg-gray-800 rounded-lg shadow-xl text-center overflow-hidden">
      <AnimatePresence mode="wait">
        {showFinalMessage ? (
          <motion.p
            key="final"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
                duration: 0.8,
                ease: "easeOut"
            }}
            className="text-4xl lg:text-5xl font-extrabold leading-tight" 
          >
            {renderFinalMessageWithColors(finalMessage)}
          </motion.p>
        ) : (
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.7 }}
            className="text-xl md:text-2xl text-gray-200 leading-relaxed italic"
            dangerouslySetInnerHTML={{ __html: renderMessageContent(index) }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}