// En: frontend/src/types/gamification.ts

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    points: number;
    type: 'finance' | 'cultivation' | 'community';
}

export interface UserAchievement {
    achievement: Achievement;
    progress: number;
    is_completed: boolean;
    completion_date?: string;
}

export interface GameProfile {
    resi_score: number;
    resilient_coins: number;
    financial_points: number;
    cultivation_points: number;
    community_points: number;
    achievements: UserAchievement[];
}