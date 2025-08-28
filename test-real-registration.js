// Comprehensive Firebase data saving test using actual AuthService
import { AuthService } from './src/services/AuthService.js';
import { db } from './firebase-server-config.js';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// Test user registration and data saving
async function testRealUserRegistration() {
  try {
    console.log('🔥 Testing real user registration with Firebase...');
    
    // Test 1: Register a business user
    console.log('🏢 Testing business user registration...');
    const businessResult = await AuthService.registerWithEmail(
      'testbusiness@indifleet.com',
      'TestPassword123!',
      'business',
      {
        firstName: 'John',
        lastName: 'Business',
        companyName: 'Test Fleet Company',
        phoneNumber: '+919876543210',
        address: 'Test Business Address'
      }
    );
    
    console.log('Business registration result:', businessResult);
    
    // Test 2: Register a postal user
    console.log('📮 Testing postal user registration...');
    const postalResult = await AuthService.registerWithEmail(
      'testpostal@indifleet.com',
      'TestPassword123!',
      'postal',
      {
        firstName: 'Jane',
        lastName: 'Postal',
        departmentName: 'Test Super Admin Portal',
        phoneNumber: '+919876543211',
        address: 'Test Postal Address'
      }
    );
    
    console.log('Postal registration result:', postalResult);
    
    // Wait a moment for Firebase to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Check if data was actually saved
    console.log('📊 Checking saved data in Firebase...');
    
    // Check users collection
    const usersSnapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(10)));
    console.log(`✅ Users in Firebase: ${usersSnapshot.size}`);
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      console.log(`👤 User: ${userData.email} (${userData.userType}) - Created: ${userData.createdAt?.toDate?.()}`);
    });
    
    // Check business profiles
    const businessSnapshot = await getDocs(query(collection(db, 'businessProfiles'), limit(10)));
    console.log(`✅ Business profiles: ${businessSnapshot.size}`);
    
    businessSnapshot.forEach((doc) => {
      const profileData = doc.data();
      console.log(`🏢 Business: ${profileData.companyName} - ${profileData.email}`);
    });
    
    // Check postal profiles
    const postalSnapshot = await getDocs(query(collection(db, 'postalProfiles'), limit(10)));
    console.log(`✅ Postal profiles: ${postalSnapshot.size}`);
    
    postalSnapshot.forEach((doc) => {
      const profileData = doc.data();
      console.log(`📮 Postal: ${profileData.departmentName} - ${profileData.email}`);
    });
    
    console.log('🎉 Firebase data saving test completed!');
    
    if (usersSnapshot.size === 0) {
      console.log('⚠️  No users found - registration may have failed');
    } else {
      console.log('✅ Data is being saved successfully to Firebase!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error.code) {
      console.error('Firebase error code:', error.code);
      console.error('Firebase error message:', error.message);
    }
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('💡 Email already in use - try with different email addresses');
    }
  }
}

// Run the comprehensive test
testRealUserRegistration();