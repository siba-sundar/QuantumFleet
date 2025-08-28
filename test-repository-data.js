// Test Firebase data saving using repository classes directly
import { UserRepository } from './src/repositories/UserRepository.js';
import { BusinessRepository } from './src/repositories/BusinessRepository.js';
import { DriverRepository } from './src/repositories/DriverRepository.js';
import { PostalRepository } from './src/repositories/PostalRepository.js';
import { TrackingSessionRepository } from './src/repositories/TrackingSessionRepository.js';

// Override Firebase config to use server-side config
import('./firebase-server-config.js').then(() => {
  console.log('🔥 Using server-side Firebase configuration');
}).catch(() => {
  console.log('⚠️  Could not load server-side config, using default');
});

async function testRepositoryDataSaving() {
  try {
    console.log('📊 Testing Firebase data saving with repositories...');
    
    // Initialize repositories
    const userRepo = new UserRepository();
    const businessRepo = new BusinessRepository();
    const driverRepo = new DriverRepository();
    const postalRepo = new PostalRepository();
    const trackingRepo = new TrackingSessionRepository();
    
    console.log('✅ Repositories initialized');
    
    // Test 1: Create a test user
    console.log('👤 Creating test user...');
    const testUser = await userRepo.create({
      email: 'testuser@indifleet.com',
      userType: 'business',
      authMethod: 'email',
      isActive: true,
      isEmailVerified: false
    });
    console.log('✅ User created:', testUser.id);
    
    // Test 2: Create a business profile
    console.log('🏢 Creating business profile...');
    const businessProfile = await businessRepo.create({
      uid: testUser.id,
      email: 'testuser@indifleet.com',
      companyName: 'Test Fleet Company',
      firstName: 'John',
      lastName: 'Business',
      phoneNumber: '+919876543210',
      address: 'Test Business Address',
      registrationStatus: 'pending'
    });
    console.log('✅ Business profile created:', businessProfile.id);
    
    // Test 3: Create a driver profile\n    console.log('🚛 Creating driver profile...');
    const driverProfile = await driverRepo.create({
      uid: 'driver_test_' + Date.now(),
      phoneNumber: '+919876543220',
      firstName: 'Mike',
      lastName: 'Driver',
      licenseNumber: 'DL123456789',
      vehicleType: 'truck',
      registrationStatus: 'approved'
    });
    console.log('✅ Driver profile created:', driverProfile.id);
    
    // Test 4: Create a postal profile
    console.log('📮 Creating postal profile...');
    const postalProfile = await postalRepo.create({
      uid: 'postal_test_' + Date.now(),
      email: 'testpostal@indifleet.com',
      departmentName: 'Test Super Admin Portal',
      firstName: 'Jane',
      lastName: 'Postal',
      phoneNumber: '+919876543230',
      address: 'Test Postal Address',
      registrationStatus: 'approved'
    });
    console.log('✅ Postal profile created:', postalProfile.id);
    
    // Test 5: Create a tracking session
    console.log('📍 Creating tracking session...');
    const trackingSession = await trackingRepo.create({
      sessionId: 'session_' + Date.now(),
      businessUid: testUser.id,
      driverUid: driverProfile.id,
      vehicleId: 'vehicle_123',
      routeId: 'route_456',
      status: 'active',
      driverPhone: '+919876543220',
      startLocation: { latitude: 28.6139, longitude: 77.2090 },
      updateIntervalSeconds: 30
    });
    console.log('✅ Tracking session created:', trackingSession.id);
    
    // Test 6: Verify data exists
    console.log('🔍 Verifying saved data...');
    
    const savedUser = await userRepo.findById(testUser.id);
    const savedBusiness = await businessRepo.findById(businessProfile.id);
    const savedDriver = await driverRepo.findById(driverProfile.id);
    const savedPostal = await postalRepo.findById(postalProfile.id);
    const savedTracking = await trackingRepo.findById(trackingSession.id);
    
    console.log('📊 Verification Results:');
    console.log(`  User found: ${!!savedUser}`);
    console.log(`  Business found: ${!!savedBusiness}`);
    console.log(`  Driver found: ${!!savedDriver}`);
    console.log(`  Postal found: ${!!savedPostal}`);
    console.log(`  Tracking found: ${!!savedTracking}`);
    
    if (savedUser && savedBusiness && savedDriver && savedPostal && savedTracking) {
      console.log('🎉 All data saved and retrieved successfully!');
      console.log('✅ Firebase database operations are working correctly');
    } else {
      console.log('⚠️  Some data was not saved or retrieved correctly');
    }
    
  } catch (error) {
    console.error('❌ Repository test failed:', error);
    console.error('Error details:', error.message);
    
    if (error.code === 'permission-denied') {
      console.log('🔒 Permission denied - check Firestore security rules');
    }
  }
}

// Run the repository test
testRepositoryDataSaving();