// Main library exports
export { WebAudioStage } from './webAudioStage';
export { WebAudioKickDrum } from './instruments/webAudioKickDrum';
export type { KickConfig } from './config';
export { KickConfigDefaults, validateKickConfig } from './config';

// Re-export for convenience
export { WebAudioStage as Stage } from './webAudioStage';