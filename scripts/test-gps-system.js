#!/usr/bin/env node

/**
 * GPS Tracking System Test Script
 * This script tests the core functionality of the GPS tracking system
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  apiBase: 'http://localhost:4000',
  testVehicleId: 'TEST001',
  testPhone: '+919876543210',
  testDriverName: 'Test Driver'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Test functions

async function testServerConnection() {
  info('Testing server connection...');
  
  try {
    const response = await fetch(`${TEST_CONFIG.apiBase}/api/health`);
    
    if (response.ok) {
      const data = await response.json();
      success('Server is running and healthy');
      log(`   Status: ${data.status}`);
      log(`   Environment: ${data.environment}`);
      log(`   WebSocket Connections: ${data.webSocket?.totalConnections || 0}`);
      return true;
    } else {
      error(`Server responded with status: ${response.status}`);
      return false;
    }
  } catch (err) {
    error(`Failed to connect to server: ${err.message}`);
    return false;
  }
}\n\nasync function testTruckAPI() {\n  info('Testing existing truck API...');\n  \n  try {\n    const response = await fetch(`${TEST_CONFIG.apiBase}/api/trucks`);\n    \n    if (response.ok) {\n      const data = await response.json();\n      success('Truck API is working');\n      log(`   Found ${data.trucks?.length || 0} trucks`);\n      return true;\n    } else {\n      error(`Truck API responded with status: ${response.status}`);\n      return false;\n    }\n  } catch (err) {\n    error(`Truck API test failed: ${err.message}`);\n    return false;\n  }\n}\n\nasync function testSMSLinkGeneration() {\n  info('Testing SMS link generation...');\n  \n  try {\n    const response = await fetch(`${TEST_CONFIG.apiBase}/api/tracking/send-tracking-link`, {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n      },\n      body: JSON.stringify({\n        phone: TEST_CONFIG.testPhone,\n        vehicleId: TEST_CONFIG.testVehicleId,\n        driverName: TEST_CONFIG.testDriverName\n      })\n    });\n    \n    if (response.ok) {\n      const data = await response.json();\n      if (data.success) {\n        success('SMS link generation successful');\n        log(`   Tracking Link: ${data.trackingLink}`);\n        log(`   Session ID: ${data.sessionId}`);\n        log(`   Simulated: ${data.simulated ? 'Yes' : 'No'}`);\n        return data.sessionId;\n      } else {\n        error(`SMS link generation failed: ${data.error}`);\n        return null;\n      }\n    } else {\n      const errorData = await response.json();\n      error(`SMS API responded with status: ${response.status}`);\n      error(`Error: ${errorData.error}`);\n      return null;\n    }\n  } catch (err) {\n    error(`SMS link generation test failed: ${err.message}`);\n    return null;\n  }\n}\n\nasync function testTrackingSessions() {\n  info('Testing tracking sessions API...');\n  \n  try {\n    const response = await fetch(`${TEST_CONFIG.apiBase}/api/tracking/sessions?status=active`);\n    \n    if (response.ok) {\n      const data = await response.json();\n      success('Tracking sessions API is working');\n      log(`   Active sessions: ${data.sessions?.length || 0}`);\n      \n      if (data.sessions && data.sessions.length > 0) {\n        const session = data.sessions[0];\n        log(`   Latest session: ${session.sessionId} (Vehicle: ${session.vehicleId})`);\n      }\n      \n      return true;\n    } else {\n      error(`Sessions API responded with status: ${response.status}`);\n      return false;\n    }\n  } catch (err) {\n    error(`Sessions API test failed: ${err.message}`);\n    return false;\n  }\n}\n\nasync function testVehicleLocationsAPI() {\n  info('Testing vehicle locations API...');\n  \n  try {\n    const response = await fetch(`${TEST_CONFIG.apiBase}/api/tracking/vehicles/locations`);\n    \n    if (response.ok) {\n      const data = await response.json();\n      success('Vehicle locations API is working');\n      log(`   Tracked vehicles: ${data.vehicles?.length || 0}`);\n      return true;\n    } else {\n      error(`Vehicle locations API responded with status: ${response.status}`);\n      return false;\n    }\n  } catch (err) {\n    error(`Vehicle locations API test failed: ${err.message}`);\n    return false;\n  }\n}\n\nasync function testAlertsAPI() {\n  info('Testing alerts API...');\n  \n  try {\n    const response = await fetch(`${TEST_CONFIG.apiBase}/api/tracking/alerts?status=active`);\n    \n    if (response.ok) {\n      const data = await response.json();\n      success('Alerts API is working');\n      log(`   Active alerts: ${data.alerts?.length || 0}`);\n      return true;\n    } else {\n      error(`Alerts API responded with status: ${response.status}`);\n      return false;\n    }\n  } catch (err) {\n    error(`Alerts API test failed: ${err.message}`);\n    return false;\n  }\n}\n\nasync function testGeofencingAPI() {\n  info('Testing geofencing API...');\n  \n  try {\n    // Test getting geofences\n    const response = await fetch(`${TEST_CONFIG.apiBase}/api/tracking/geofences`);\n    \n    if (response.ok) {\n      const data = await response.json();\n      success('Geofencing API is working');\n      log(`   Configured geofences: ${data.geofences?.length || 0}`);\n      \n      // Test creating a test geofence\n      const createResponse = await fetch(`${TEST_CONFIG.apiBase}/api/tracking/geofences`, {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n        },\n        body: JSON.stringify({\n          name: 'Test Geofence',\n          centerLat: 28.7041,\n          centerLng: 77.1025,\n          radiusMeters: 500,\n          alertType: 'both',\n          fleetId: 'test_fleet'\n        })\n      });\n      \n      if (createResponse.ok) {\n        const createData = await createResponse.json();\n        success('Test geofence created successfully');\n        log(`   Geofence ID: ${createData.geofence?.id}`);\n      } else {\n        warning('Could not create test geofence (may already exist)');\n      }\n      \n      return true;\n    } else {\n      error(`Geofencing API responded with status: ${response.status}`);\n      return false;\n    }\n  } catch (err) {\n    error(`Geofencing API test failed: ${err.message}`);\n    return false;\n  }\n}\n\nasync function testSessionInfo(sessionId) {\n  if (!sessionId) {\n    warning('No session ID available, skipping session info test');\n    return false;\n  }\n  \n  info(`Testing session info API for session: ${sessionId}`);\n  \n  try {\n    const response = await fetch(`${TEST_CONFIG.apiBase}/api/tracking/${sessionId}/info`);\n    \n    if (response.ok) {\n      const data = await response.json();\n      if (data.success) {\n        success('Session info API is working');\n        log(`   Session ID: ${data.session.sessionId}`);\n        log(`   Vehicle ID: ${data.session.vehicleId}`);\n        log(`   Status: ${data.session.status}`);\n        log(`   Expires: ${new Date(data.session.expiresAt).toLocaleString()}`);\n        return true;\n      } else {\n        error(`Session info failed: ${data.error}`);\n        return false;\n      }\n    } else {\n      error(`Session info API responded with status: ${response.status}`);\n      return false;\n    }\n  } catch (err) {\n    error(`Session info test failed: ${err.message}`);\n    return false;\n  }\n}\n\nasync function checkEnvironmentSetup() {\n  info('Checking environment setup...');\n  \n  // Check if .env files exist\n  const fs = await import('fs');\n  const path = await import('path');\n  \n  const rootEnv = path.join(__dirname, '.env');\n  const backendEnv = path.join(__dirname, 'backend', '.env');\n  \n  let envIssues = [];\n  \n  if (!fs.existsSync(rootEnv)) {\n    envIssues.push('Root .env file not found');\n  }\n  \n  if (!fs.existsSync(backendEnv)) {\n    envIssues.push('Backend .env file not found');\n  }\n  \n  if (envIssues.length > 0) {\n    error('Environment setup issues:');\n    envIssues.forEach(issue => log(`   - ${issue}`, colors.red));\n    warning('Please refer to GPS_TRACKING_SETUP.md for configuration instructions');\n    return false;\n  } else {\n    success('Environment files found');\n    return true;\n  }\n}\n\nasync function runAllTests() {\n  log(`${colors.bold}🚀 IndiFleet GPS Tracking System Test Suite${colors.reset}`);\n  log('=' * 50);\n  \n  const results = {\n    total: 0,\n    passed: 0,\n    failed: 0\n  };\n  \n  const tests = [\n    { name: 'Environment Setup', fn: checkEnvironmentSetup },\n    { name: 'Server Connection', fn: testServerConnection },\n    { name: 'Truck API', fn: testTruckAPI },\n    { name: 'SMS Link Generation', fn: testSMSLinkGeneration },\n    { name: 'Tracking Sessions', fn: testTrackingSessions },\n    { name: 'Vehicle Locations API', fn: testVehicleLocationsAPI },\n    { name: 'Alerts API', fn: testAlertsAPI },\n    { name: 'Geofencing API', fn: testGeofencingAPI }\n  ];\n  \n  let sessionId = null;\n  \n  for (const test of tests) {\n    results.total++;\n    log(`\\n--- Running ${test.name} Test ---`);\n    \n    try {\n      const result = await test.fn();\n      \n      // Special handling for SMS test to get session ID\n      if (test.name === 'SMS Link Generation' && result) {\n        sessionId = result;\n      }\n      \n      if (result) {\n        results.passed++;\n      } else {\n        results.failed++;\n      }\n    } catch (err) {\n      error(`Test failed with exception: ${err.message}`);\n      results.failed++;\n    }\n  }\n  \n  // Additional test with session ID if available\n  if (sessionId) {\n    results.total++;\n    log(`\\n--- Running Session Info Test ---`);\n    try {\n      const result = await testSessionInfo(sessionId);\n      if (result) {\n        results.passed++;\n      } else {\n        results.failed++;\n      }\n    } catch (err) {\n      error(`Session info test failed: ${err.message}`);\n      results.failed++;\n    }\n  }\n  \n  // Print summary\n  log(`\\n${colors.bold}📊 Test Summary${colors.reset}`);\n  log('=' * 30);\n  log(`Total Tests: ${results.total}`);\n  success(`Passed: ${results.passed}`);\n  if (results.failed > 0) {\n    error(`Failed: ${results.failed}`);\n  }\n  \n  const successRate = ((results.passed / results.total) * 100).toFixed(1);\n  log(`Success Rate: ${successRate}%`);\n  \n  if (results.failed === 0) {\n    success('\\n🎉 All tests passed! GPS tracking system is ready.');\n    info('\\nNext steps:');\n    info('1. Configure your Google Maps API key');\n    info('2. Set up Twilio for SMS (optional)');\n    info('3. Start the backend server: cd backend && npm run dev');\n    info('4. Start the frontend: npm run dev');\n    info('5. Access GPS Management in the fleet dashboard');\n  } else {\n    warning('\\n⚠️  Some tests failed. Please check the errors above.');\n    info('Refer to GPS_TRACKING_SETUP.md for troubleshooting guidance.');\n  }\n  \n  process.exit(results.failed > 0 ? 1 : 0);\n}\n\n// Handle errors gracefully\nprocess.on('uncaughtException', (err) => {\n  error(`Uncaught exception: ${err.message}`);\n  process.exit(1);\n});\n\nprocess.on('unhandledRejection', (reason, promise) => {\n  error(`Unhandled rejection at: ${promise}, reason: ${reason}`);\n  process.exit(1);\n});\n\n// Run tests\nif (import.meta.url === `file://${process.argv[1]}`) {\n  runAllTests();\n}"