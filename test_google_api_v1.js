const axios = require('axios');

const apiKey = 'AIzaSyDQ3nCMuhh8SnSpKmc8Ki1RmF4PfpYF058';

async function testV1API() {
  console.log('🔍 Testing Google Generative AI API (v1)...');
  
  // Test 1: List models using v1 API
  try {
    console.log('\n📋 Listing available models (v1 API)...');
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    console.log('✅ API Key works with v1 API!');
    console.log('\n🎯 Available Models:');
    response.data.models.forEach(model => {
      if (model.name.includes('gemini')) {
        console.log(`  - ${model.name.replace('models/', '')}`);
        console.log(`    Supported: ${model.supportedGenerationMethods.join(', ')}`);
      }
    });
  } catch (error) {
    console.error('❌ v1 API Error:', error.response?.data || error.message);
  }
  
  // Test 2: List models using v1beta API
  try {
    console.log('\n📋 Listing available models (v1beta API)...');
    const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    console.log('✅ API Key works with v1beta API!');
    console.log('\n🎯 Available Models:');
    response.data.models.forEach(model => {
      if (model.name.includes('gemini')) {
        console.log(`  - ${model.name.replace('models/', '')}`);
        console.log(`    Supported: ${model.supportedGenerationMethods.join(', ')}`);
      }
    });
  } catch (error) {
    console.error('❌ v1beta API Error:', error.response?.data || error.message);
  }
  
  // Test 3: Try generating content with v1 API
  try {
    console.log('\n🧪 Testing content generation (v1 API)...');
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{
            text: 'Say hello'
          }]
        }]
      }
    );
    console.log('✅ Content generation works!');
    console.log('Response:', response.data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error('❌ Content generation error:', error.response?.data || error.message);
  }
}

testV1API();
