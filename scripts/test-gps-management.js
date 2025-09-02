/**
 * Test script for GPS Management functionality with phone and email support
 */

const API_BASE = 'http://localhost:4001';

// Test data
const testData = {
  phoneContact: {
    vehicleId: 'test_vehicle_123',
    contactMethod: 'phone',
    phone: '+919876543210',
    driverName: 'John Doe'
  },
  emailContact: {
    vehicleId: 'test_vehicle_456',
    contactMethod: 'email',
    email: 'driver@example.com',
    driverName: 'Jane Smith'
  }
};

async function makeRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  
  if (data) options.body = JSON.stringify(data);
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testPhoneTracking() {
  console.log('\n=== Testing Phone-based GPS Tracking ===');
  
  const result = await makeRequest('/api/tracking/send-tracking-link', 'POST', testData.phoneContact);
  
  if (result.success) {
    console.log('✅ Phone tracking link sent successfully');
    console.log('📱 Phone:', testData.phoneContact.phone);
    console.log('🚛 Vehicle:', testData.phoneContact.vehicleId);
    return result.data.trackingSessionId;
  } else {
    console.log('❌ Phone tracking failed:', result.data?.error || result.error);
    return null;
  }
}

async function testEmailTracking() {
  console.log('\n=== Testing Email-based GPS Tracking ===');
  
  const result = await makeRequest('/api/tracking/send-tracking-link', 'POST', testData.emailContact);
  
  if (result.success) {
    console.log('✅ Email tracking link sent successfully');
    console.log('📧 Email:', testData.emailContact.email);
    console.log('🚛 Vehicle:', testData.emailContact.vehicleId);
    return result.data.trackingSessionId;
  } else {
    console.log('❌ Email tracking failed:', result.data?.error || result.error);
    return null;
  }
}

async function testActiveSessions() {
  console.log('\n=== Testing Active Sessions Retrieval ===');
  
  const result = await makeRequest('/api/tracking/sessions?status=active');
  
  if (result.success) {
    const sessions = result.data.sessions || [];
    console.log(`✅ Retrieved ${sessions.length} active sessions`);
    
    sessions.forEach((session, index) => {
      console.log(`\n📍 Session ${index + 1}:`);
      console.log('   🆔 ID:', session.sessionId);
      console.log('   🚛 Vehicle:', session.vehicleId);
      console.log('   📞 Phone:', session.driverPhone || 'N/A');
      console.log('   📧 Email:', session.driverEmail || 'N/A');
      console.log('   📡 Method:', session.contactMethod || 'phone');
    });
    
    return sessions;
  } else {
    console.log('❌ Failed to retrieve sessions:', result.data?.error || result.error);
    return [];
  }
}

async function runTests() {
  console.log('🚀 Starting GPS Management Tests');
  console.log('================================');
  
  try {
    await testPhoneTracking();
    await testEmailTracking();
    await testActiveSessions();
    
    console.log('\n================================');
    console.log('🎉 All GPS Management tests completed!');
    console.log('\n💡 Notes:');
    console.log('   - SMS/Email will be simulated');
    console.log('   - Check backend console for output');
    console.log('   - Both contact methods supported');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

export { runTests, testPhoneTracking, testEmailTracking, testActiveSessions };