#!/usr/bin/env node

// API Connection Test - Debug script for authentication and API issues
console.log('🔧 API Connection Diagnostic Tool');
console.log('=' .repeat(50));

// Test different API endpoints to identify connection issues
const tests = [
  {
    name: 'Backend Health Check (Port 4001)',
    url: 'http://localhost:4001/api/health',
    method: 'GET'
  },
  {
    name: 'Backend Health Check (Port 4000 - OLD)',
    url: 'http://localhost:4000/api/health',
    method: 'GET'
  },
  {
    name: 'API Base Configuration',
    test: 'config'
  }
];

async function runTests() {
  for (const test of tests) {
    console.log(`\\n🧪 ${test.name}:`);
    
    if (test.test === 'config') {
      console.log('   ✅ Expected API Base: http://localhost:4001');
      console.log('   📝 Configuration source: import.meta.env.VITE_API_BASE || http://localhost:4001');
      console.log('   🔍 To override: create .env file with VITE_API_BASE=http://localhost:4001');
      continue;
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(test.url, {
        method: test.method,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ Status: ${response.status} ${response.statusText}`);
        console.log(`   📊 Response: ${JSON.stringify(data, null, 2)}`);
      } else {
        console.log(`   ⚠️  Status: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.log(`   📄 Error: ${errorText}`);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('   ⏰ Request timed out (5s)');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.log('   ❌ Connection refused - server not running on this port');
      } else {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
  }
  
  console.log('\\n📋 TROUBLESHOOTING GUIDE:');
  console.log('1. If port 4001 works: ✅ Backend is correctly configured');
  console.log('2. If port 4000 fails: ✅ Old configuration is not interferring');
  console.log('3. If both fail: ❌ Backend server may not be running');
  console.log('\\n🔧 SOLUTIONS:');
  console.log('• Restart backend: cd backend && PORT=4001 npm start');
  console.log('• Clear browser cache: Ctrl+Shift+R (or Cmd+Shift+R)');
  console.log('• Check browser console for CORS errors');
  console.log('• Verify no other services are using port 4001');
  console.log('\\n🌐 Browser Cache Issues:');
  console.log('• Clear localStorage: localStorage.clear() in browser console');
  console.log('• Hard refresh the page');
  console.log('• Try incognito/private browsing mode');
}

// Check if running in Node.js
if (typeof window === 'undefined') {
  // Node.js environment
  try {
    runTests();
  } catch (error) {
    console.error('❌ Test script error:', error.message);
    console.log('\\n💡 Note: This script needs fetch API support');
    console.log('   Try running in browser console instead');
  }
} else {
  // Browser environment
  console.log('✅ Running in browser - all tests should work');
  runTests();
}