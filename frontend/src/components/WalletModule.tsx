'use client';

import { useState } from 'react';
import { FaCoins, FaPlusCircle, FaHistory } from 'react-icons/fa';

// Datos de ejemplo
const coinBalance = 1250;
const transactions = [
    { type: 'Gasto', description: 'Compra de Miel Pura', amount: -150, date: '2025-09-12' },
    { type: 'Ganancia', description: 'Meta de Ahorro Completada', amount: 50, date: '2025-09-11' },
    { type: 'Ganancia', description: 'Venta de Tomates Cherry', amount: 200, date: '2025-09-10' },
];

export default function WalletModule() {
    return (
        <div className="bg-gray-800 p-6 rounded-lg w-full max-w-4xl mx-auto space-y-6">
            <h3 className="text-2xl font-bold text-white text-center">Billetera Resiliente</h3>
            
            {/* Saldo Principal */}
            <div className="bg-gray-900 p-6 rounded-xl flex flex-col items-center gap-4">
                <p className="text-gray-400 font-semibold">Mi Saldo Actual</p>
                <div className="flex items-center gap-3 text-yellow-400">
                    <FaCoins className="text-5xl" />
                    <span className="text-6xl font-bold">{coinBalance.toLocaleString('es-AR')}</span>
                </div>
                <button className="mt-4 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                    <FaPlusCircle />
                    Comprar Monedas (Próximamente)
                </button>
            </div>

            {/* Historial de Transacciones */}
            <div>
                <h4 className="font-bold text-white text-lg mb-3 flex items-center gap-2"><FaHistory /> Últimos Movimientos</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {transactions.map((tx, index) => (
                        <div key={index} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-white">{tx.description}</p>
                                <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString('es-AR')}</p>
                            </div>
                            <span className={`font-bold text-lg ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
