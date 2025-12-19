const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = 'AIzaSyDQ3nCMuhh8SnSpKmc8Ki1RmF4PfpYF058';

async function testGemini25() {
  console.log('🧪 Testing Gemini 2.5 Flash...\n');
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: 'You are REAL HOLLY, a helpful AI assistant.'
    });
    
    console.log('📤 Sending test message...');
    const result = await model.generateContent('Hi Holly, how are you?');
    const response = result.response.text();
    
    console.log('✅ SUCCESS! Holly responds:\n');
    console.log(response);
    console.log('\n🎉 Gemini 2.5 Flash is working perfectly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testGemini25();
