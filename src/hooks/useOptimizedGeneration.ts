// Optimized Generation Hook - Fast, reliable, user-friendly
import { useState, useCallback, useRef } from 'react';
import { optimizedDBCoachService, OptimizedGenerationStep, OptimizedGenerationProgress } from '../services/optimizedDBCoachService';
import { fastGenerationService, FastGenerationResult } from '../services/fastGenerationService';

export interface UseOptimizedGenerationOptions {
  mode?: 'fast' | 'detailed';
  enableFallback?: boolean;
  showProgress?: boolean;
  timeout?: number;
}

export interface OptimizedGenerationState {
  isGenerating: boolean;
  progress: OptimizedGenerationProgress | null;
  results: OptimizedGenerationStep[] | null;
  fastResult: FastGenerationResult | null;
  error: string | null;
  executionTime: number;
  mode: 'fast' | 'detailed';
}

export function useOptimizedGeneration(options: UseOptimizedGenerationOptions = {}) {
  const {
    mode = 'fast',
    enableFallback = true,
    showProgress = true,
    timeout = 30000
  } = options;

  const [state, setState] = useState<OptimizedGenerationState>({
    isGenerating: false,
    progress: null,
    results: null,
    fastResult: null,
    error: null,
    executionTime: 0,
    mode
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fast single-shot generation
  const generateFast = useCallback(async (
    prompt: string,
    dbType: string
  ): Promise<void> => {
    if (state.isGenerating) {
      console.warn('Generation already in progress');
      return;
    }

    setState(prev => ({
      ...prev,
      isGenerating: true,
      progress: null,
      results: null,
      fastResult: null,
      error: null,
      mode: 'fast'
    }));

    startTimeRef.current = Date.now();

    try {
      console.log('🚀 Starting fast generation...');

      // Show initial progress if enabled
      if (showProgress) {
        setState(prev => ({
          ...prev,
          progress: {
            step: 'analysis',
            agent: 'Fast Generator',
            reasoning: 'Generating complete database solution...',
            isComplete: false,
            currentStep: 1,
            totalSteps: 1,
            estimatedTimeRemaining: 15000
          }
        }));
      }

      const result = await fastGenerationService.generateDatabase(
        prompt,
        dbType,
        {
          timeout,
          useCache: true
        }
      );

      const executionTime = Date.now() - startTimeRef.current;

      setState(prev => ({
        ...prev,
        isGenerating: false,
        fastResult: result,
        executionTime,
        progress: showProgress ? {
          step: 'analysis',
          agent: 'Fast Generator',
          reasoning: result.fallbackUsed ? 
            'Completed using fallback (network issue detected)' : 
            'Database solution generated successfully!',
          isComplete: true,
          currentStep: 1,
          totalSteps: 1,
          estimatedTimeRemaining: 0
        } : null
      }));

      console.log(`✅ Fast generation completed in ${executionTime}ms`);

    } catch (error) {
      console.error('❌ Fast generation failed:', error);
      
      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Generation failed',
        executionTime: Date.now() - startTimeRef.current
      }));
    }
  }, [state.isGenerating, showProgress, timeout]);

  // Detailed multi-step generation
  const generateDetailed = useCallback(async (
    prompt: string,
    dbType: string
  ): Promise<void> => {
    if (state.isGenerating) {
      console.warn('Generation already in progress');
      return;
    }

    setState(prev => ({
      ...prev,
      isGenerating: true,
      progress: null,
      results: null,
      fastResult: null,
      error: null,
      mode: 'detailed'
    }));

    startTimeRef.current = Date.now();
    abortControllerRef.current = new AbortController();

    try {
      console.log('🚀 Starting detailed generation...');

      const progressCallback = (progress: OptimizedGenerationProgress) => {
        if (showProgress) {
          setState(prev => ({
            ...prev,
            progress
          }));
        }
      };

      const results = await optimizedDBCoachService.generateDatabaseDesign(
        prompt,
        dbType,
        progressCallback
      );

      const executionTime = Date.now() - startTimeRef.current;

      setState(prev => ({
        ...prev,
        isGenerating: false,
        results,
        executionTime
      }));

      console.log(`✅ Detailed generation completed in ${executionTime}ms`);

    } catch (error) {
      console.error('❌ Detailed generation failed:', error);
      
      // Try fallback to fast mode if enabled
      if (enableFallback && !abortControllerRef.current?.signal.aborted) {
        console.log('🔄 Falling back to fast mode...');
        await generateFast(prompt, dbType);
        return;
      }

      setState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Generation failed',
        executionTime: Date.now() - startTimeRef.current
      }));
    }
  }, [state.isGenerating, showProgress, enableFallback, generateFast]);

  // Main generation function that chooses mode
  const generate = useCallback(async (
    prompt: string,
    dbType: string,
    preferredMode?: 'fast' | 'detailed'
  ): Promise<void> => {
    const actualMode = preferredMode || mode;
    
    if (actualMode === 'fast') {
      await generateFast(prompt, dbType);
    } else {
      await generateDetailed(prompt, dbType);
    }
  }, [mode, generateFast, generateDetailed]);

  // Cancel generation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setState(prev => ({
      ...prev,
      isGenerating: false,
      progress: null,
      error: 'Generation cancelled by user'
    }));

    console.log('🛑 Generation cancelled');
  }, []);

  // Reset state
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState({
      isGenerating: false,
      progress: null,
      results: null,
      fastResult: null,
      error: null,
      executionTime: 0,
      mode
    });

    console.log('🔄 Generation state reset');
  }, [mode]);

  // Switch mode
  const switchMode = useCallback((newMode: 'fast' | 'detailed') => {
    if (state.isGenerating) {
      console.warn('Cannot switch mode while generation is in progress');
      return;
    }

    setState(prev => ({
      ...prev,
      mode: newMode,
      results: null,
      fastResult: null,
      error: null
    }));
  }, [state.isGenerating]);

  // Get content based on mode
  const getContent = useCallback((): string | null => {
    if (state.mode === 'fast' && state.fastResult) {
      return state.fastResult.content;
    }
    
    if (state.mode === 'detailed' && state.results) {
      return state.results.map(step => 
        `## ${step.title}\n\n${step.content}`
      ).join('\n\n---\n\n');
    }

    return null;
  }, [state.mode, state.fastResult, state.results]);

  // Get summary statistics
  const getStats = useCallback(() => {
    return {
      mode: state.mode,
      executionTime: state.executionTime,
      hasResults: Boolean(state.fastResult || state.results),
      fallbackUsed: state.fastResult?.fallbackUsed || false,
      stepsCompleted: state.results?.length || (state.fastResult ? 1 : 0),
      isComplete: !state.isGenerating && (Boolean(state.fastResult) || Boolean(state.results))
    };
  }, [state]);

  return {
    // State
    ...state,
    
    // Actions
    generate,
    generateFast,
    generateDetailed,
    cancelGeneration,
    reset,
    switchMode,
    
    // Computed
    getContent,
    getStats,
    
    // Utilities
    hasResults: Boolean(state.fastResult || state.results),
    canCancel: state.isGenerating,
    estimatedProgress: state.progress ? 
      (state.progress.currentStep / state.progress.totalSteps) * 100 : 0
  };
}

export default useOptimizedGeneration;