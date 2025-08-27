// Authentication Debug Test
console.log('🔍 Authentication Debug Report');
console.log('=' .repeat(50));

// Test 1: Check if we're in the browser
if (typeof window !== 'undefined') {
  console.log('✅ Running in browser environment');
  
  // Test 2: Check if Firebase is loaded
  if (typeof window.firebase !== 'undefined') {
    console.log('✅ Firebase is loaded');
  } else {
    console.log('⚠️  Firebase not detected on window object');
  }
  
  // Test 3: Check localStorage for any auth tokens
  const authKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('firebase') || key.includes('auth') || key.includes('user'))) {
      authKeys.push(key);
    }
  }
  
  if (authKeys.length > 0) {
    console.log('✅ Found auth-related localStorage keys:', authKeys);
  } else {
    console.log('⚠️  No auth-related localStorage keys found');
  }
  
  // Test 4: Check sessionStorage
  const sessionAuthKeys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('firebase') || key.includes('auth') || key.includes('user'))) {
      sessionAuthKeys.push(key);
    }
  }
  
  if (sessionAuthKeys.length > 0) {
    console.log('✅ Found auth-related sessionStorage keys:', sessionAuthKeys);
  } else {
    console.log('⚠️  No auth-related sessionStorage keys found');
  }
  
  // Test 5: Check if we can access the auth context
  setTimeout(() => {
    const authElement = document.querySelector('[data-testid="auth-status"]');
    if (authElement) {
      console.log('✅ Auth status element found:', authElement.textContent);
    } else {
      console.log('⚠️  Auth status element not found - auth context may not be initialized');
    }
    
    // Check if user info is displayed
    const userInfo = document.querySelector('.text-green-700');
    if (userInfo && userInfo.textContent.includes('Logged in as:')) {
      console.log('✅ User authentication UI found:', userInfo.textContent);
    } else {
      console.log('⚠️  User authentication UI not found');
    }
  }, 2000);
  
} else {
  console.log('❌ Not running in browser environment');
}

// Usage instructions
console.log('\\n📋 DEBUGGING STEPS:');
console.log('1. Open browser console on the reservation page');
console.log('2. Copy and paste this script to run authentication checks');
console.log('3. Look for any error messages in the console');
console.log('4. Check if the "Logged in as:" status shows at the top');
console.log('5. If not logged in, go to sign-in page and authenticate');
console.log('\\n🔧 QUICK FIX ATTEMPTS:');
console.log('- Try refreshing the page');
console.log('- Clear browser localStorage/sessionStorage');
console.log('- Sign out and sign back in');
console.log('- Check browser console for any Firebase errors');