// En: frontend/src/components/InfoTooltip.tsx
'use client';
import { useState } from 'react';

export default function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex items-center ml-2">
      <button 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)} // Para que funcione en celulares
        className="w-5 h-5 bg-gray-600 text-white rounded-full text-xs font-bold flex items-center justify-center cursor-help"
      >
        i
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-900 border border-gray-700 text-white text-sm rounded-lg p-3 shadow-lg z-10">
          {text}
        </div>
      )}
    </div>
  );
}