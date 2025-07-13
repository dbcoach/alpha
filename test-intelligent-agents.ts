/**
 * Quick test script to verify the intelligent agents are working
 * Run this to see the difference between old and new responses
 */

import { intelligentAgentDemo } from './src/demo/intelligentAgentDemo.ts';

async function quickTest() {
  console.log('🧪 Quick Test of Intelligent AI Agents\n');
  
  try {
    // Test the components
    await intelligentAgentDemo.testIntelligentComponents();
    
    console.log('\n✅ If all tests pass, the intelligent agents are working!');
    console.log('🚀 DB.Coach will now provide intelligent, contextual responses');
    console.log('   instead of repetitive template responses.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n🔧 Check your VITE_GEMINI_API_KEY environment variable');
  }
}

// Run the test
quickTest();

// Ensure this file is treated as an ES module
export {};
