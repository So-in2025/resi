// En: frontend/src/types/gamification.ts

// Esta interfaz define la metadata de un logro o insignia
export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    // El tipo debe ser uno de estos 3 valores literales
    type: 'finance' | 'cultivation' | 'community';
}

// Esta interfaz rastrea el progreso de un usuario hacia un logro
export interface UserAchievement {
    achievement: Achievement; // Se referencia a la interfaz de arriba
    progress: number;
    is_completed: boolean;
    completion_date?: string;
}

// Esta interfaz representa el perfil de juego completo de un usuario
export interface GameProfile {
    resi_score: number;
    resilient_coins: number;
    financial_points: number;
    cultivation_points: number;
    community_points: number;
    // La API devolverá una lista de logros del usuario
    achievements: UserAchievement[];
}