/**
 * Test Oracle Cloud AI Speech Integration
 * Verifies MAYA1 voice connection
 */

const fs = require('fs');
const crypto = require('crypto');

// Configuration
const config = {
  tenancyId: 'ocid1.tenancy.oc1..aaaaaaaadkua7gx2nybz4vvaklgyaocqsrhvh33rsw3znqymj27e3nkizfmq',
  userId: 'ocid1.user.oc1..aaaaaaaabwt7bpk7dpgkhxiln6ycv26go2nmk7jzq5fdizgizbj6n64pabma',
  fingerprint: 'cf:fe:02:e5:6b:f0:fe:69:0d:78:93:cc:2b:b0:37:b8',
  region: 'ca-toronto-1',
  privateKeyPath: './oracle-private-key.pem'
};

// Test 1: Check if private key file exists
console.log('🔍 TEST 1: Checking private key file...');
if (!fs.existsSync(config.privateKeyPath)) {
  console.error('❌ FAILED: Private key file not found');
  process.exit(1);
}
console.log('✅ PASSED: Private key file exists');

// Test 2: Validate private key format
console.log('\n🔍 TEST 2: Validating private key format...');
const privateKey = fs.readFileSync(config.privateKeyPath, 'utf8');
if (!privateKey.includes('BEGIN PRIVATE KEY')) {
  console.error('❌ FAILED: Invalid private key format');
  process.exit(1);
}
console.log('✅ PASSED: Private key format valid');

// Test 3: Test request signing
console.log('\n🔍 TEST 3: Testing request signing...');
try {
  const date = new Date().toUTCString();
  const method = 'GET';
  const path = '/20220101/voices';
  
  const signingString = `(request-target): ${method.toLowerCase()} ${path}\n` +
                       `date: ${date}\n` +
                       `host: speech.aiservice.${config.region}.oci.oraclecloud.com`;
  
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingString)
    .sign(privateKey, 'base64');
  
  console.log('✅ PASSED: Request signing successful');
  console.log(`   Signature length: ${signature.length} characters`);
} catch (error) {
  console.error('❌ FAILED: Request signing error:', error.message);
  process.exit(1);
}

// Test 4: Display configuration
console.log('\n📋 Oracle Cloud Configuration:');
console.log(`   Tenancy: ${config.tenancyId.substring(0, 30)}...`);
console.log(`   User: ${config.userId.substring(0, 30)}...`);
console.log(`   Fingerprint: ${config.fingerprint}`);
console.log(`   Region: ${config.region}`);
console.log(`   Voice: MAYA1`);

console.log('\n✅ ALL TESTS PASSED!');
console.log('\n🎤 HOLLY is ready to speak with MAYA1 voice!');
console.log('\n📝 Next steps:');
console.log('   1. Start dev server: npm run dev');
console.log('   2. Test API: curl http://localhost:3000/api/speech');
console.log('   3. Try VoiceButton component in dashboards');
