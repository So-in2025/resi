// En: frontend/src/components/GamificationModule.tsx
'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useSession, signIn } from 'next-auth/react';
import { FaCoins, FaStar, FaMedal, FaLock, FaCheckCircle, FaChartLine, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import SectionHeader from './SectionHeader';
import { GameProfile, UserAchievement } from '@/types/gamification';

const ProgressRing = ({ value, max }: { value: number; max: number }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / max) * circumference;
    const strokeDashoffset = Math.max(0, offset); 

    return (
        <svg className="w-32 h-32" viewBox="0 0 120 120">
            <circle
                className="text-gray-700"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="60"
                cy="60"
            />
            <motion.circle
                className="text-green-500"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="60"
                cy="60"
                strokeLinecap="round"
                style={{ strokeDasharray: circumference }}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: strokeDashoffset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
            />
            <text x="60" y="60" textAnchor="middle" className="text-xl font-bold fill-white">
                {value}
            </text>
            <text x="60" y="80" textAnchor="middle" className="text-sm fill-gray-400">
                / {max}
            </text>
        </svg>
    );
};

const AchievementCard = ({ achievement, progress, is_completed }: UserAchievement) => {
    const cardVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.9 },
        visible: { opacity: 1, y: 0, scale: 1 }
    };
    
    return (
        <motion.div
            variants={cardVariants}
            className={`p-4 rounded-lg flex flex-col items-center text-center transition-all duration-300 ${
                is_completed ? 'bg-green-900 border-2 border-green-500' : 'bg-gray-700 hover:bg-gray-600'
            }`}
        >
            <div className="text-4xl mb-2">{achievement.icon}</div>
            <h5 className="font-bold text-lg text-white">{achievement.name}</h5>
            <p className="text-sm text-gray-400 mb-2">{achievement.description}</p>
            {!is_completed && (
                <div className="w-full bg-gray-600 rounded-full h-2.5 mt-2">
                    <div 
                        className="bg-blue-500 h-2.5 rounded-full" 
                        style={{ width: `${(progress / achievement.points) * 100}%` }}
                    ></div>
                </div>
            )}
        </motion.div>
    );
};

export default function GamificationModule() {
    const { data: session, status } = useSession();
    const [profile, setProfile] = useState<GameProfile | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
        const fetchProfile = async () => {
            if (status === 'authenticated' && session?.user?.email) {
                setIsLoading(true);
                try {
                    const response = await apiClient.get<GameProfile>('/gamification', {
                        headers: { 'Authorization': `Bearer ${session.user.email}` }
                    });
                    setProfile(response.data);
                    setFetchError(null);
                } catch (error) {
                    console.error("Error al obtener el perfil de juego:", error);
                    setProfile(null);
                    setFetchError("Hubo un problema al cargar tu perfil de juego. Por favor, revisa el servidor.");
                } finally {
                    setIsLoading(false);
                }
            } else if (status === 'unauthenticated') {
                setProfile(null);
                setFetchError(null);
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [session, status]);

    if (status === 'unauthenticated') {
        return (
            <div className="text-center p-8">
                <h3 className="text-2xl font-bold text-white mb-4">¡Te damos la bienvenida a la gamificación!</h3>
                <p className="text-gray-300 mb-6">Inicia sesión para ganar monedas, logros y ver tu ResiScore.</p>
                <button onClick={() => signIn('google')} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold">
                    Ingresar para empezar
                </button>
            </div>
        );
    }
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-4xl text-green-400" />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="text-center p-8 bg-red-900/20 text-red-400 rounded-lg flex flex-col items-center justify-center h-64">
                <FaExclamationTriangle className="text-4xl mb-4" />
                <p className="mb-2">{fetchError}</p>
                <p className="text-sm">Por favor, inténtalo de nuevo más tarde o verifica la conexión con el servidor.</p>
            </div>
        );
    }
    
    const maxResiScore = 1000;
    const { financial_points, cultivation_points, community_points, resilient_coins, resi_score } = profile!;
    
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const completedAchievements = profile!.achievements.filter(a => a.is_completed);
    const inProgressAchievements = profile!.achievements.filter(a => !a.is_completed);

    return (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-12">
            <SectionHeader title="Comunidad y Gamificación" subtitle="¡Gana recompensas por construir tu resiliencia financiera!" />
            
            <div className="bg-gray-800 p-8 rounded-lg flex flex-col items-center shadow-2xl">
                <div className="flex flex-col md:flex-row items-center justify-around w-full max-w-2xl mb-8">
                    <div className="flex flex-col items-center mb-6 md:mb-0">
                        <ProgressRing value={resi_score} max={maxResiScore} />
                        <h3 className="text-2xl font-bold text-green-400 mt-4">ResiScore</h3>
                    </div>
                    <div className="flex flex-col items-center">
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 1.5, duration: 0.5 }}
                            className="bg-yellow-800/50 p-4 rounded-full flex items-center justify-center w-24 h-24 border-2 border-yellow-500"
                        >
                            <FaCoins className="text-6xl text-yellow-400" />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-white mt-4">{resilient_coins} Monedas</h3>
                        <p className="text-gray-400 text-sm">Gánalas con cada logro.</p>
                    </div>
                </div>
                
                <div className="w-full mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <motion.div variants={containerVariants} className="bg-gray-700 p-4 rounded-lg">
                        <h4 className="font-bold text-lg text-white flex items-center justify-center gap-2">
                            <FaChartLine className="text-blue-400"/> Finanzas
                        </h4>
                        <p className="text-3xl font-mono text-blue-300 mt-2">{financial_points}</p>
                    </motion.div>
                    <motion.div variants={containerVariants} className="bg-gray-700 p-4 rounded-lg">
                        <h4 className="font-bold text-lg text-white flex items-center justify-center gap-2">
                            <FaStar className="text-yellow-400"/> Cultivo
                        </h4>
                        <p className="text-3xl font-mono text-yellow-300 mt-2">{cultivation_points}</p>
                    </motion.div>
                    <motion.div variants={containerVariants} className="bg-gray-700 p-4 rounded-lg">
                        <h4 className="font-bold text-lg text-white flex items-center justify-center gap-2">
                            <FaMedal className="text-purple-400"/> Comunidad
                        </h4>
                        <p className="text-3xl font-mono text-purple-300 mt-2">{community_points}</p>
                    </motion.div>
                </div>
            </div>

            <div className="space-y-6">
                <h4 className="text-2xl font-bold text-white flex items-center gap-2">
                    Logros Completados <FaCheckCircle className="text-green-500" />
                </h4>
                {completedAchievements.length > 0 ? (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <AnimatePresence>
                            {completedAchievements.map(achiev => (
                                <AchievementCard key={achiev.achievement.id} {...achiev} />
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <p className="text-gray-400">Aún no completaste ningún logro. ¡Manos a la obra!</p>
                )}

                <h4 className="text-2xl font-bold text-white mt-8 flex items-center gap-2">
                    Logros en Progreso <FaLock className="text-red-500" />
                </h4>
                {inProgressAchievements.length > 0 ? (
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         <AnimatePresence>
                             {inProgressAchievements.map(achiev => (
                                <AchievementCard key={achiev.achievement.id} {...achiev} />
                            ))}
                         </AnimatePresence>
                    </motion.div>
                ) : (
                    <p className="text-gray-400">No hay logros en curso. ¡Registra tus primeras actividades para empezar!</p>
                )}
            </div>
        </motion.div>
    );
}