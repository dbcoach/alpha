// Response validation utilities for detecting truncated AI responses
export interface ResponseValidationResult {
  isComplete: boolean;
  issues: string[];
  confidence: number;
  suggestionForFix?: string;
}

export class ResponseValidator {
  /**
   * Comprehensive validation for AI responses
   */
  static validate(content: string, phase?: string): ResponseValidationResult {
    const issues: string[] = [];
    let confidence = 1.0;

    // 1. Check for incomplete code blocks
    const codeBlockValidation = this.validateCodeBlocks(content);
    if (!codeBlockValidation.isComplete) {
      issues.push(...codeBlockValidation.issues);
      confidence *= 0.7;
    }

    // 2. Check for truncation indicator phrases
    const phraseValidation = this.validateTruncationPhrases(content);
    if (!phraseValidation.isComplete) {
      issues.push(...phraseValidation.issues);
      confidence *= 0.5; // Severe penalty for obvious truncation
    }

    // 3. Phase-specific validation
    if (phase) {
      const phaseValidation = this.validatePhaseSpecific(content, phase);
      if (!phaseValidation.isComplete) {
        issues.push(...phaseValidation.issues);
        confidence *= 0.8;
      }
    }

    // 4. Check for abrupt endings
    const endingValidation = this.validateResponseEnding(content);
    if (!endingValidation.isComplete) {
      issues.push(...endingValidation.issues);
      confidence *= 0.9;
    }

    return {
      isComplete: issues.length === 0,
      issues,
      confidence,
      suggestionForFix: issues.length > 0 ? this.generateFixSuggestion(issues) : undefined
    };
  }

  /**
   * Validate code blocks are complete
   */
  private static validateCodeBlocks(content: string): { isComplete: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Count code block markers
    const codeBlockMarkers = (content.match(/```/g) || []).length;
    if (codeBlockMarkers % 2 !== 0) {
      issues.push('Incomplete code block detected - unmatched ``` markers');
    }

    // Check for specific language blocks
    const languageBlocks = content.match(/```(\w+)/g) || [];
    for (const block of languageBlocks) {
      const language = block.replace('```', '');
      if (['python', 'sql', 'javascript', 'json'].includes(language)) {
        // Ensure the block has proper structure
        const blockPattern = new RegExp(`\`\`\`${language}[\\s\\S]*?\`\`\``, 'g');
        const completeBlocks = content.match(blockPattern) || [];
        const openBlocks = content.match(new RegExp(`\`\`\`${language}`, 'g')) || [];
        
        if (openBlocks.length > completeBlocks.length) {
          issues.push(`Incomplete ${language} code block detected`);
        }
      }
    }

    return { isComplete: issues.length === 0, issues };
  }

  /**
   * Check for common truncation phrases
   */
  private static validateTruncationPhrases(content: string): { isComplete: boolean; issues: string[] } {
    const issues: string[] = [];
    
    const truncationPatterns = [
      /It seems there was a misunderstanding/i,
      /Let me provide/i,
      /I'll need to/i,
      /However,?\s*$/i,
      /Unfortunately,?\s*$/i,
      /I apologize,?\s*$/i,
      /Let me continue/i,
      /I need to/i,
      /But first/i,
      /\.\.\.\s*$/,  // Ends with ellipsis
      /in the inte\s*$/i  // Specific pattern from the user's issue
    ];

    for (const pattern of truncationPatterns) {
      if (pattern.test(content)) {
        issues.push(`Response contains truncation indicator: "${content.match(pattern)?.[0]}"`);
        break; // Only report the first one found
      }
    }

    return { isComplete: issues.length === 0, issues };
  }

  /**
   * Phase-specific validation
   */
  private static validatePhaseSpecific(content: string, phase: string): { isComplete: boolean; issues: string[] } {
    const issues: string[] = [];

    switch (phase.toLowerCase()) {
      case 'implementation':
        // Check for incomplete function definitions
        if (content.includes('def ') && !/def\s+\w+\([^)]*\):[^}]*return/s.test(content)) {
          const lastLine = content.trim().split('\n').pop() || '';
          if (!lastLine.includes('return') && !lastLine.includes('}') && !lastLine.includes('```')) {
            issues.push('Implementation appears to be cut off mid-function');
          }
        }

        // Check for incomplete class definitions
        if (content.includes('class ') && !content.includes('```') && content.length > 5000) {
          const classBlocks = content.match(/class\s+\w+[^{]*{[^}]*}/gs) || [];
          const classStarts = content.match(/class\s+\w+/g) || [];
          if (classStarts.length > classBlocks.length) {
            issues.push('Incomplete class definition detected');
          }
        }
        break;

      case 'design':
      case 'schema':
        // Check for incomplete schema definitions
        if (content.includes('CREATE TABLE') && !content.includes(');')) {
          issues.push('Schema definition appears incomplete - missing closing statements');
        }
        break;

      case 'validation':
        // Validation should have conclusions
        if (!content.toLowerCase().includes('valid') && !content.toLowerCase().includes('recommend')) {
          issues.push('Validation response lacks clear conclusions');
        }
        break;
    }

    return { isComplete: issues.length === 0, issues };
  }

  /**
   * Check if response ends abruptly
   */
  private static validateResponseEnding(content: string): { isComplete: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (content.length < 100) return { isComplete: true, issues }; // Skip short responses

    const trimmedContent = content.trim();
    const lastSentence = trimmedContent.split(/[.!?]/).filter(s => s.trim()).pop() || '';
    
    // Check if last sentence is suspiciously short
    if (lastSentence.length < 10 && !trimmedContent.endsWith('```') && content.length > 3000) {
      issues.push('Response may be cut off abruptly');
    }

    // Check if ends mid-word
    const lastChar = trimmedContent.slice(-1);
    if (/[a-z]/i.test(lastChar) && !trimmedContent.endsWith('```')) {
      const lastWord = trimmedContent.split(/\s+/).pop() || '';
      if (lastWord.length > 15) { // Suspiciously long "word" might be cut off
        issues.push('Response appears to end mid-word');
      }
    }

    return { isComplete: issues.length === 0, issues };
  }

  /**
   * Generate suggestion for fixing detected issues
   */
  private static generateFixSuggestion(issues: string[]): string {
    if (issues.some(issue => issue.includes('truncation indicator'))) {
      return 'Request continuation: "Please continue from where the previous response was cut off."';
    }
    
    if (issues.some(issue => issue.includes('code block'))) {
      return 'Request completion: "Please complete the incomplete code blocks in the previous response."';
    }
    
    if (issues.some(issue => issue.includes('cut off'))) {
      return 'Request full response: "The previous response appears incomplete. Please provide the complete implementation."';
    }
    
    return 'Request regeneration with explicit instruction to provide complete response.';
  }

  /**
   * Quick check specifically for VectorDB implementation issues
   */
  static validateVectorDBImplementation(content: string): ResponseValidationResult {
    const validation = this.validate(content, 'implementation');
    
    // Additional VectorDB-specific checks
    const vectorDbIssues: string[] = [];
    
    if (content.includes('VectorDB') || content.includes('vector') || content.includes('embedding')) {
      // Check for common VectorDB components
      const requiredComponents = [
        'embedding',
        'vector',
        'similarity',
        'index'
      ];
      
      const missingComponents = requiredComponents.filter(component => 
        !content.toLowerCase().includes(component)
      );
      
      if (missingComponents.length > 2) {
        vectorDbIssues.push(`VectorDB implementation missing key components: ${missingComponents.join(', ')}`);
      }
    }
    
    return {
      ...validation,
      issues: [...validation.issues, ...vectorDbIssues],
      isComplete: validation.isComplete && vectorDbIssues.length === 0
    };
  }
}

export default ResponseValidator;