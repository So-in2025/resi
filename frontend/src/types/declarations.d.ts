// En: frontend/src/types/declarations.d.ts

interface IMicRecorder {
  start(): Promise<void>;
  stop(): {
    getMp3(): Promise<[number[], Blob]>;
  };
}

declare module 'mic-recorder-to-mp3' {
  const MicRecorder: new (options?: { bitRate?: number }) => IMicRecorder;
  export default MicRecorder;
}