'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import apiClient from '@/lib/apiClient';
import toast from 'react-hot-toast';
import { FaCoins, FaHistory, FaPlus, FaSpinner } from 'react-icons/fa';

interface Transaction {
    id: number;
    amount: number;
    item_id: number;
    status: string;
    buyer_email: string;
    seller_email: string;
    timestamp: string;
}

interface WalletData {
    resilient_coins: number;
    transactions: Transaction[];
}

export default function WalletModule() {
    const { data: session, status } = useSession();
    const [walletData, setWalletData] = useState<WalletData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchWalletData = useCallback(async () => {
        if (!session?.user?.email) return;
        setIsLoading(true);
        try {
            const [profileRes, transactionsRes] = await Promise.all([
                apiClient.get('/gamification', { headers: { 'Authorization': `Bearer ${session.user.email}` } }),
                apiClient.get('/market/my-transactions', { headers: { 'Authorization': `Bearer ${session.user.email}` } })
            ]);
            
            setWalletData({
                resilient_coins: profileRes.data.resilient_coins,
                transactions: transactionsRes.data,
            });

        } catch (error) {
            console.error("Error al cargar la billetera:", error);
            toast.error("No se pudo cargar la información de tu billetera.");
        } finally {
            setIsLoading(false);
        }
    }, [session]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchWalletData();
        }
    }, [status, fetchWalletData]);

    if (isLoading) {
        return <div className="bg-gray-800 p-6 rounded-lg text-center"><FaSpinner className="animate-spin mx-auto text-green-400 text-2xl" /></div>;
    }

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-2xl font-bold text-white text-center mb-4">Mi Billetera Resiliente</h3>
            <div className="text-center bg-gray-900 p-6 rounded-lg mb-6">
                <p className="text-gray-400 text-sm">SALDO ACTUAL</p>
                <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold text-5xl my-2">
                    <FaCoins />
                    <span>{walletData?.resilient_coins?.toLocaleString('es-AR') || 0}</span>
                </div>
                <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 mx-auto">
                    <FaPlus /> Comprar Monedas
                </button>
            </div>
            <div>
                <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2"><FaHistory /> Historial de Transacciones del Mercado</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {walletData?.transactions && walletData.transactions.length > 0 ? walletData.transactions.map(tx => {
                        const isBuyer = tx.buyer_email === session?.user?.email;
                        return (
                            <div key={tx.id} className={`flex justify-between items-center p-2 rounded-md ${isBuyer ? 'bg-red-900/50' : 'bg-green-900/50'}`}>
                                <div>
                                    <p className="font-semibold text-white">{isBuyer ? 'Compra' : 'Venta'} de item #{tx.item_id}</p>
                                    <p className="text-xs text-gray-400">{new Date(tx.timestamp).toLocaleString('es-AR')} - <span className="capitalize">{tx.status}</span></p>
                                </div>
                                <p className={`font-bold ${isBuyer ? 'text-red-400' : 'text-green-400'}`}>
                                    {isBuyer ? '-' : '+'} {tx.amount}
                                </p>
                            </div>
                        )
                    }) : <p className="text-center text-gray-500 py-4">No hay transacciones todavía.</p>}
                </div>
            </div>
        </div>
    );
}

