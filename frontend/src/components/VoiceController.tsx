// En: frontend/src/components/VoiceController.tsx
'use client';

import { useResiVoice } from '@/hooks/useResiVoice';

export default function VoiceController() {
  // Este componente no dibuja nada, solo activa el hook de la voz.
  useResiVoice();
  return null;
}