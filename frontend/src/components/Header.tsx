// En: frontend/src/components/Header.tsx
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/apiClient';
import { FaCoins, FaStar } from 'react-icons/fa';

interface DashboardData {
    income: number;
    total_spent: number;
}
interface GameProfileData {
    resi_score: number;
    resilient_coins: number;
}
interface HeaderProps {
    refreshTrigger?: number;
}

const HeaderSkeleton = () => (
    <header className="bg-gray-800 text-white p-4 flex flex-col md:flex-row md:justify-between md:items-center shadow-lg animate-pulse">
        <div className="flex justify-between items-center w-full md:w-auto mb-4 md:mb-0">
            <div className="text-2xl font-bold bg-gray-700 h-8 w-20 rounded"></div>
        </div>
        <div className="w-full md:w-auto flex flex-col md:flex-row md:items-center md:gap-8">
            <div className="flex justify-between items-center md:flex-col md:items-start text-sm md:text-base mb-2 md:mb-0">
                <div className="h-4 w-32 bg-gray-700 rounded mb-1"></div>
                <div className="h-4 w-28 bg-gray-700 rounded"></div>
            </div>
            <div className="flex flex-col w-full md:w-48 mb-4 md:mb-0">
                <div className="h-2 w-full bg-gray-600 rounded-full"></div>
            </div>
            <div className="flex items-center gap-4">
                <div className="h-10 w-32 bg-gray-700 rounded-lg"></div>
                <div className="h-10 w-20 bg-gray-700 rounded-lg"></div>
            </div>
        </div>
    </header>
);

export default function Header({ refreshTrigger }: HeaderProps) {
    const { data: session, status } = useSession();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [gameProfile, setGameProfile] = useState<GameProfileData | null>(null);

    const fetchData = useCallback(async () => {
        if (status !== 'authenticated' || !session?.user?.email) {
            setDashboardData(null);
            setGameProfile(null);
            return;
        }
        try {
            const [dashboardRes, gamificationRes] = await Promise.all([
                apiClient.get('/finance/dashboard-summary', { headers: { 'Authorization': `Bearer ${session.user.email}` } }),
                apiClient.get('/gamification', { headers: { 'Authorization': `Bearer ${session.user.email}` } }),
            ]);
            setDashboardData(dashboardRes.data);
            setGameProfile(gamificationRes.data);
        } catch (error) {
            console.error("Error al cargar los datos del dashboard en el header:", error);
            setDashboardData(null);
            setGameProfile(null);
        }
    }, [status, session]);

    useEffect(() => {
        if (status === 'authenticated') {
            fetchData();
        } else if (status === 'unauthenticated') {
            setDashboardData(null);
            setGameProfile(null);
        }
    }, [status, session, refreshTrigger, fetchData]);

    if (status === 'loading') {
        return <HeaderSkeleton />;
    }

    const remainingPercentage = dashboardData && dashboardData.income > 0
        ? (dashboardData.total_spent / dashboardData.income) * 100
        : 0;
    
    return (
        <header className="bg-gray-800 text-white p-4 flex flex-col md:flex-row md:justify-between md:items-center shadow-lg">
            <div className="flex justify-between items-center w-full md:w-auto mb-4 md:mb-0">
                <Link href="/" className="text-2xl font-bold text-green-400">
                    Resi
                </Link>
                {status === "unauthenticated" && (
                    <button onClick={() => signIn('google')} className="md:hidden bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold">
                        Ingresar
                    </button>
                )}
            </div>

            {status === "authenticated" && dashboardData && (
                <div className="w-full md:w-auto flex flex-col md:flex-row md:items-center md:gap-8">
                    <div className="flex justify-between items-center md:flex-col md:items-start text-sm md:text-base mb-2 md:mb-0">
                        <p className="text-gray-400">Ingreso: <span className="font-bold text-green-400">${dashboardData.income.toLocaleString('es-AR')}</span></p>
                        <p className="text-gray-400">Gastado: <span className="font-bold text-red-400">${dashboardData.total_spent.toLocaleString('es-AR')}</span></p>
                    </div>
                    
                    <div className="flex flex-col w-full md:w-48 mb-4 md:mb-0">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progreso del mes</span>
                            <span>{remainingPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ease-out ${remainingPercentage > 90 ? 'bg-red-500' : remainingPercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(100, remainingPercentage)}%` }}
                            ></div>
                        </div>
                    </div>

                    {gameProfile && (
                        <div className="flex items-center space-x-4 mb-4 md:mb-0">
                            <div className="flex items-center">
                                <FaStar className="text-yellow-400 mr-1" />
                                <span className="text-sm font-semibold">{gameProfile.resi_score}</span>
                            </div>
                            <div className="flex items-center">
                                <FaCoins className="text-yellow-400 mr-1" />
                                <span className="text-sm font-semibold">{gameProfile.resilient_coins}</span>
                            </div>
                        </div>
                    )}
                    
                    <nav className="flex items-center justify-between md:justify-start gap-4 w-full">
                        <Link href="/planner" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold whitespace-nowrap">
                            Panel de control
                        </Link>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-300 hidden sm:block whitespace-nowrap">Hola, {session.user?.name}</span>
                            <button onClick={() => signOut()} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold whitespace-nowrap">
                                Salir
                            </button>
                        </div>
                    </nav>
                </div>
            )}

            {status === "unauthenticated" && (
                <nav className="hidden md:flex items-center">
                    <button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold">
                        Ingresar con Google
                    </button>
                </nav>
            )}
        </header>
    );
}