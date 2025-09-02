#!/usr/bin/env node

// Simple test script to validate truck reservation API
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4001';

// Test data
const mockReservation = {
  businessUid: 'test-business-123',
  customerInfo: {
    contactName: 'John Doe',
    contactPhone: '+1234567890',
    contactEmail: 'john@example.com',
    company: 'Test Company Inc',
    specialInstructions: 'Handle with care'
  },
  trucks: [
    {
      pickupLocation: 'Mumbai, Maharashtra',
      dropLocation: 'Delhi, India',
      pickupDate: '2024-01-15',
      dropDate: '2024-01-17',
      checkpoints: [
        {
          location: 'Pune Junction',
          date: '2024-01-16',
          weight: '500',
          goodsType: 'Electronics',
          handlingInstructions: 'Fragile items'
        }
      ]
    },
    {
      pickupLocation: 'Chennai, Tamil Nadu',
      dropLocation: 'Bangalore, Karnataka',
      pickupDate: '2024-01-20',
      dropDate: '2024-01-22',
      checkpoints: [
        {
          location: 'Salem',
          date: '2024-01-21',
          weight: '750',
          goodsType: 'Textiles',
          handlingInstructions: 'Keep dry'
        }
      ]
    }
  ]
};

async function testAPI() {
  console.log('🚀 Testing IndiFleet Truck Reservation API...');
  console.log('=' .repeat(50));

  try {
    // Test 1: Health check
    console.log('✅ Test 1: Health Check');
    const healthRes = await fetch(`${API_BASE}/api/health`);
    if (healthRes.ok) {
      const healthData = await healthRes.json();
      console.log('   Status:', healthData.status);
      console.log('   Environment:', healthData.environment);
    } else {
      console.log('   ❌ Health check failed');
      return;
    }

    // Test 2: Create reservation
    console.log('\\n✅ Test 2: Create Reservation');
    const createRes = await fetch(`${API_BASE}/api/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockReservation)
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      console.log('   ✅ Reservation created successfully');
      console.log('   Reservation ID:', createData.reservation?.id);
      console.log('   Total Cost:', createData.reservation?.totalCost);
      
      const reservationId = createData.reservation?.id;
      
      if (reservationId) {
        // Test 3: Fetch reservation
        console.log('\\n✅ Test 3: Fetch Reservation');
        const fetchRes = await fetch(`${API_BASE}/api/reservations/${reservationId}`);
        if (fetchRes.ok) {
          const fetchData = await fetchRes.json();
          console.log('   ✅ Reservation fetched successfully');
          console.log('   Status:', fetchData.reservation?.status);
          console.log('   Business UID:', fetchData.reservation?.businessUid);
        } else {
          console.log('   ❌ Failed to fetch reservation');
        }

        // Test 4: Update status
        console.log('\\n✅ Test 4: Update Reservation Status');
        const updateRes = await fetch(`${API_BASE}/api/reservations/${reservationId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'confirmed' })
        });
        
        if (updateRes.ok) {
          const updateData = await updateRes.json();
          console.log('   ✅ Status updated successfully');
          console.log('   New Status:', updateData.reservation?.status);
        } else {
          console.log('   ❌ Failed to update status');
        }
      }
    } else {
      const errorData = await createRes.json();
      console.log('   ❌ Failed to create reservation:', errorData.error);
    }

    // Test 5: Fetch all reservations
    console.log('\\n✅ Test 5: Fetch All Reservations');
    const allRes = await fetch(`${API_BASE}/api/reservations`);
    if (allRes.ok) {
      const allData = await allRes.json();
      console.log('   ✅ Reservations fetched successfully');
      console.log('   Total Count:', allData.count);
    } else {
      console.log('   ❌ Failed to fetch reservations');
    }

    // Test 6: Create and list trucks
    console.log('\\n✅ Test 6: Create and List Trucks');
    const truckRes = await fetch(`${API_BASE}/api/trucks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxCapacity: 1000,
        routeId: 1,
        number: 'TN01AB1234',
        driver: 'Raj Kumar',
        status: 'available'
      })
    });

    if (truckRes.ok) {
      const truckData = await truckRes.json();
      console.log('   ✅ Truck created successfully');
      console.log('   Truck ID:', truckData.truck?.id);
      
      // List trucks
      const listRes = await fetch(`${API_BASE}/api/trucks`);
      if (listRes.ok) {
        const listData = await listRes.json();
        console.log('   ✅ Trucks listed successfully');
        console.log('   Total Trucks:', listData.count);
      }
    } else {
      const truckError = await truckRes.json();
      console.log('   ❌ Failed to create truck:', truckError.error);
    }

    console.log('\\n🎉 API Testing Complete!');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\\n💡 Make sure the backend server is running on port 4001');
    console.log('   To start: cd backend && PORT=4001 npm start');
  }
}

// Handle import error for node-fetch in older versions
testAPI().catch((error) => {
  if (error.message.includes('fetch')) {
    console.log('❌ node-fetch not available. Using basic HTTP test...');
    console.log('\\n💡 To run full tests, install node-fetch:');
    console.log('   npm install node-fetch');
    console.log('\\nFor now, you can test the API manually:');
    console.log(`   curl ${API_BASE}/api/health`);
  } else {
    console.error('Test error:', error);
  }
});