#!/usr/bin/env node

// Test reservation creation with actual data
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4001';

const testReservation = {
  businessUid: 'test-business-user-123',
  customerInfo: {
    contactName: 'John Doe',
    contactPhone: '+1234567890',
    contactEmail: 'john@testcompany.com',
    company: 'Test Logistics Inc',
    specialInstructions: 'Handle with care'
  },
  trucks: [
    {
      pickupLocation: 'Mumbai Port',
      dropLocation: 'Delhi Warehouse',
      pickupDate: '2024-02-01',
      dropDate: '2024-02-03',
      checkpoints: [
        {
          location: 'Pune Junction',
          date: '2024-02-02',
          weight: '500',
          goodsType: 'Electronics',
          handlingInstructions: 'Fragile - handle with care'
        }
      ]
    }
  ]
};

async function testReservationAPI() {
  console.log('🧪 Testing Reservation API...');
  console.log('=' .repeat(40));

  try {
    console.log('📤 Sending reservation data...');
    console.log(JSON.stringify(testReservation, null, 2));
    
    const response = await fetch(`${API_BASE}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testReservation)
    });

    console.log(`\\n📊 Response Status: ${response.status} ${response.statusText}`);
    
    const responseData = await response.json();
    console.log('📋 Response Data:');
    console.log(JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('\\n✅ SUCCESS: Reservation API is working!');
      return responseData;
    } else {
      console.log('\\n❌ FAILED: API returned error');
      return null;
    }
  } catch (error) {
    console.error('\\n💥 ERROR:', error.message);
    console.log('\\n🔧 Check if backend server is running:');
    console.log('   cd backend && PORT=4001 npm start');
    return null;
  }
}

// Handle different environments
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires node-fetch');
  console.log('💡 Install with: npm install node-fetch');
  console.log('\\n🌐 Or test in browser console:');
  console.log(`fetch('${API_BASE}/api/reservations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${JSON.stringify(testReservation)})
}).then(r => r.json()).then(console.log)`);
} else {
  testReservationAPI();
}