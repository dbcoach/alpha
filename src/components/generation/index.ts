// Generation components - Clean separation between streaming and final display
export { FinalGenerationDisplay } from './FinalGenerationDisplay';
export { StreamingGenerationWrapper } from './StreamingGenerationWrapper';

// Re-export types for convenience
export type { GenerationPhase, FinalGenerationResult } from '../../services/resultAggregationService';
export type { StreamingToGenerationState } from '../../hooks/useStreamingToGeneration';