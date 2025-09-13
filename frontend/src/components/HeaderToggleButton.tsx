'use client';

import { FaEye, FaEyeSlash } from 'react-icons/fa';

interface HeaderToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
}

/**
 * Un botón flotante y fijo para mostrar u ocultar el encabezado principal,
 * con una animación para llamar la atención.
 * @param isVisible - Estado actual de visibilidad del encabezado.
 * @param onToggle - Función para cambiar el estado de visibilidad.
 */
export default function HeaderToggleButton({ isVisible, onToggle }: HeaderToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 right-4 z-[60] bg-gray-700 text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 animate-pulse-once"
      aria-label={isVisible ? 'Ocultar encabezado' : 'Mostrar encabezado'}
    >
      {isVisible ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
    </button>
  );
}