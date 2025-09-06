// En: frontend/src/components/FloatingActionButton.tsx

'use client';

import { FaPlus } from 'react-icons/fa'; // Importamos FaPlus

interface FloatingActionButtonProps {
  onClick: () => void;
}

const FloatingActionButton = ({ onClick }: FloatingActionButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="bg-green-500 text-white w-14 h-14 rounded-full shadow-lg 
                 flex items-center justify-center transition-transform transform hover:scale-110
                 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-opacity-75"
      aria-label="Agregar Gasto"
    >
      <FaPlus size={24} /> {/* Icono de "+" */}
    </button>
  );
};

export default FloatingActionButton;