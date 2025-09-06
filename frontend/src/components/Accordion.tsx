// En: frontend/src/components/Accordion.tsx
'use client';

interface AccordionProps {
  id: string; // Nuevo: para identificar el acordeón
  title: string;
  children: React.ReactNode;
  isOpen: boolean; // Nuevo: controla si está abierto
  onToggle: () => void; // Nuevo: función para cambiar el estado
}

export default function Accordion({ id, title, children, isOpen, onToggle }: AccordionProps) {
  return (
    <div className="w-full max-w-4xl bg-gray-800 rounded-lg border border-gray-700 mb-4">
      <button
        onClick={onToggle}
        className="w-full flex justify-between items-center p-6 text-left"
      >
        <h2 className="text-2xl font-bold text-green-400">{title}</h2>
        <svg
          className={`w-6 h-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}