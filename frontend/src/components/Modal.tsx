// En: frontend/src/components/Modal.tsx

'use client';

import React, { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

export default function Modal({ isOpen, onClose, children, title }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      // Si el modal está abierto y el clic fue fuera del contenido del modal...
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div 
        className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg relative"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()} // Evita que el clic dentro del modal cierre la ventana
      >
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}