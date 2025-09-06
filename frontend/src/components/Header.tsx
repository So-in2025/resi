'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import axios from 'axios';

interface DashboardData {
    income: number;
    total_spent: number;
}

interface HeaderProps {
    refreshTrigger?: number; // La prop ahora es opcional
}

export default function Header({ refreshTrigger }: HeaderProps) {
    const { data: session, status } = useSession();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

    const fetchData = async () => {
        if (status !== 'authenticated' || !session?.user?.email) {
            setDashboardData(null);
            return;
        }
        try {
            const response = await axios.get('http://localhost:8000/dashboard-summary', {
                headers: { 'Authorization': `Bearer ${session.user.email}` }
            });
            const data: DashboardData = response.data;
            setDashboardData({
                income: data.income,
                total_spent: data.total_spent
            });
        } catch (error) {
            console.error("Error al cargar los datos del dashboard en el header:", error);
            setDashboardData(null);
        }
    };

    useEffect(() => {
        if (status === 'authenticated') {
            fetchData();
        } else if (status === 'unauthenticated') {
            setDashboardData(null);
        }
    }, [status, session, refreshTrigger]);

    const remainingPercentage = dashboardData && dashboardData.income > 0
        ? (dashboardData.total_spent / dashboardData.income) * 100
        : 0;
    
    return (
        <header className="bg-gray-800 text-white p-4 flex flex-col md:flex-row md:justify-between md:items-center shadow-lg sticky top-0 z-50">
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
                        <p className="text-gray-400">Ingreso: <span className="font-bold text-green-400">${dashboardData.income.toLocaleString()}</span></p>
                        <p className="text-gray-400">Gastado: <span className="font-bold text-red-400">${dashboardData.total_spent.toLocaleString()}</span></p>
                    </div>
                    
                    <div className="flex flex-col w-full md:w-48 mb-4 md:mb-0">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progreso del mes</span>
                            <span>{remainingPercentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-500 ease-out"
                                style={{ width: `${Math.min(100, remainingPercentage)}%` }}
                            ></div>
                        </div>
                    </div>

                    <nav className="flex items-center gap-4">
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