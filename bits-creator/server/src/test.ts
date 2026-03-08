import { executeClaudeAgent } from './claude';

async function runTests() {
//   console.log('='.repeat(80));
//   console.log('Test 1: Create a bit that implements bit-database but uses mongodb');
//   console.log('='.repeat(80));
  
//   try {
//     await executeClaudeAgent("Create a bit that implements bit-database but uses mongodb");
//     console.log('\n✅ Test 1 completed successfully\n');
//   } catch (error) {
//     console.error('\n❌ Test 1 failed:', error);
//   }

  console.log('='.repeat(80));
  console.log('Test 2: Create a habit that takes an image and describes everything in it');
  console.log('='.repeat(80));
  
  try {
    await executeClaudeAgent("Create a habit that takes an image and describes everything in it, put it in examples");
    console.log('\n✅ Test 2 completed successfully\n');
  } catch (error) {
    console.error('\n❌ Test 2 failed:', error);
  }

  console.log('='.repeat(80));
  console.log('All tests completed');
  console.log('='.repeat(80));
}

runTests().catch(console.error);
