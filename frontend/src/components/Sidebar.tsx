'use client';

import { FaHome, FaChartPie, FaLeaf, FaTimes, FaBars } from "react-icons/fa";
import Link from "next/link";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onSidebarClick: (id: string) => void;
}

const Sidebar = ({ isOpen, onClose, onOpen, onSidebarClick }: SidebarProps) => {
  const navigationItems = [
    { name: 'Inicio', href: '#', id: 'inicio', icon: FaHome },
    { name: 'Mis Finanzas', href: '#mis-finanzas', id: 'mis-finanzas', icon: FaChartPie },
    { name: 'Módulo Cultivo', href: '#modulo-cultivo', id: 'modulo-cultivo', icon: FaLeaf },
  ];

  return (
    <>
      {/* Versión para Escritorios (se expande al pasar el cursor) */}
      <div
        className="hidden md:flex flex-col items-start 
                   md:w-20 md:hover:w-52 transition-all duration-300 ease-in-out
                   p-4 bg-gray-900 text-white sticky top-0 h-screen overflow-hidden group"
      >
        <div className="flex flex-col items-start group-hover:items-start space-y-4 pt-4">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onSidebarClick(item.id)}
              className={`flex items-center space-x-4 p-3 rounded-lg transition-colors duration-200 
                hover:bg-gray-700 hover:text-green-400
              `}
            >
              <item.icon size={20} />
              <span className="hidden group-hover:inline font-medium whitespace-nowrap">
                {item.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Versión para Móviles (se desliza) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform md:hidden
                   ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                   w-64 p-6 transition-transform duration-300 ease-in-out bg-gray-900 text-white`}
      >
        <div className="flex justify-end items-center mb-8">
          <button onClick={onClose} className="text-white hover:text-green-400 transition-colors">
            <FaTimes size={24} />
          </button>
        </div>
        <nav className="space-y-4">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onSidebarClick(item.id)}
              className={`flex items-center space-x-4 p-3 rounded-lg transition-colors duration-200 
                hover:bg-gray-700 hover:text-green-400
              `}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Botón para abrir el sidebar en móviles */}
      {!isOpen && (
        <button
          onClick={onOpen}
          className="md:hidden fixed top-4 left-4 z-40 p-2 bg-gray-800 rounded-lg shadow-lg text-white"
        >
          <FaBars size={24} />
        </button>
      )}
    </>
  );
};

export default Sidebar;