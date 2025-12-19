const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'AIzaSyDQ3nCMuhh8SnSpKmc8Ki1RmF4PfpYF058';

async function testAPI() {
  try {
    console.log('🔍 Testing Google API Key...');
    console.log('API Key:', apiKey);
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test 1: List available models
    console.log('\n📋 Attempting to list models...');
    try {
      const models = await genAI.listModels();
      console.log('✅ API Key is VALID!');
      console.log('\n🎯 Available Gemini Models:');
      for (const model of models) {
        if (model.name.includes('gemini')) {
          console.log(`  - ${model.name}`);
        }
      }
    } catch (listError) {
      console.error('❌ Failed to list models:', listError.message);
    }
    
    // Test 2: Try different model names
    const modelsToTry = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-flash-002',
      'gemini-1.5-flash-001',
      'gemini-1.5-pro-latest',
      'gemini-pro'
    ];
    
    console.log('\n🧪 Testing model availability...');
    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hi');
        console.log(`  ✅ ${modelName} - WORKS!`);
        break; // Stop on first working model
      } catch (error) {
        console.log(`  ❌ ${modelName} - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error);
  }
}

testAPI();
