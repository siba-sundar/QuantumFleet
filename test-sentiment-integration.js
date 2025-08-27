#!/usr/bin/env node

/**
 * Integration Test Script for IndiFleet Sentiment Analysis and Fleet Management
 * 
 * This script tests the complete integration of:
 * 1. Sentiment analysis with Gemini 2.5 Flash Lite
 * 2. Enhanced fleet management with reservations
 * 3. Driver details display with sentiment scores
 * 
 * Run this script to verify the implementation:
 * node test-sentiment-integration.js
 */

import fetch from 'node-fetch';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const API_BASE = 'http://localhost:4001';

// Test configuration
const TEST_CONFIG = {
  driverId: 'test_driver_001',
  sampleSurveyData: {
    driverID: 'test_driver_001',
    jobSatisfaction: 'Good',
    relationshipWithManagement: 'Excellent',
    workHours: '45',
    mentalHealth: 'Good',
    physicalHealth: 'Excellent',
    salarySatisfaction: 'Satisfied',
    workConditions: 'Good'
  }
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.bold}${colors.blue}=== ${message} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function makeRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    log(`Making request to: ${url}`, 'blue');
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    }
    
    return { success: true, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testServerConnection() {
  logHeader('Testing Server Connection');
  
  const result = await makeRequest('/api/realtime/stats');
  
  if (result.success) {
    logSuccess('Backend server is running and accessible');
    log(`WebSocket stats: ${JSON.stringify(result.data.stats, null, 2)}`);
    return true;
  } else {
    logError(`Failed to connect to backend: ${result.error}`);
    logWarning('Please ensure the backend server is running on port 4001');
    return false;
  }
}

async function testSentimentAnalysis() {
  logHeader('Testing Sentiment Analysis Integration');
  
  // Test 1: Submit sentiment survey
  log('1. Submitting driver sentiment survey...');
  const surveyResult = await makeRequest('/api/sentiment/survey', {
    method: 'POST',
    body: JSON.stringify({
      driverId: TEST_CONFIG.driverId,
      surveyData: TEST_CONFIG.sampleSurveyData
    })
  });
  
  if (surveyResult.success) {
    logSuccess('Sentiment survey submitted successfully');
    log(`Sentiment Score: ${surveyResult.data.analysis.sentimentScore}/100`);
    log(`Sentiment Label: ${surveyResult.data.analysis.sentimentLabel}`);
    log(`Analysis: ${surveyResult.data.analysis.analysis}`);
    
    // Test 2: Fetch current sentiment
    log('\n2. Fetching current driver sentiment...');
    const currentResult = await makeRequest(`/api/sentiment/driver/${TEST_CONFIG.driverId}/current`);
    
    if (currentResult.success) {
      logSuccess('Current sentiment data retrieved successfully');
      log(`Has Sentiment Data: ${currentResult.data.hasSentimentData}`);
      if (currentResult.data.hasSentimentData) {
        log(`Current Score: ${currentResult.data.currentScore}/100`);
        log(`Current Label: ${currentResult.data.currentLabel}`);
      }
    } else {
      logError(`Failed to fetch current sentiment: ${currentResult.error}`);
    }
    
    // Test 3: Fetch sentiment history
    log('\n3. Fetching sentiment history...');
    const historyResult = await makeRequest(`/api/sentiment/driver/${TEST_CONFIG.driverId}?limit=5`);
    
    if (historyResult.success) {
      logSuccess(`Retrieved ${historyResult.data.history.length} sentiment records`);
    } else {
      logWarning(`Could not fetch sentiment history: ${historyResult.error}`);
    }
    
    return true;
  } else {
    logError(`Failed to submit sentiment survey: ${surveyResult.error}`);
    if (surveyResult.error.includes('GOOGLE_AI_STUDIO_API_KEY')) {
      logWarning('Google AI Studio API key is not configured. Please set GOOGLE_AI_STUDIO_API_KEY in your .env file');
    }
    return false;
  }
}

async function testFleetManagement() {
  logHeader('Testing Enhanced Fleet Management');
  
  // Test 1: Fetch enhanced fleet data
  log('1. Fetching enhanced fleet data...');
  const fleetResult = await makeRequest('/api/trucks/enhanced?includeReserved=true&includeSentiment=true');
  
  if (fleetResult.success) {
    logSuccess(`Retrieved ${fleetResult.data.trucks.length} trucks from enhanced fleet`);
    log(`Reserved trucks: ${fleetResult.data.reservedCount}`);
    log(`Total trucks: ${fleetResult.data.totalCount}`);
    
    // Display sample truck data
    if (fleetResult.data.trucks.length > 0) {
      const sampleTruck = fleetResult.data.trucks[0];
      log(`Sample truck: ${sampleTruck.number}`);
      log(`Driver: ${sampleTruck.driver?.name || 'Unassigned'}`);
      log(`Status: ${sampleTruck.status}`);
      log(`Reserved: ${sampleTruck.isReserved}`);
      if (sampleTruck.driver?.sentimentScore) {
        log(`Driver Sentiment: ${sampleTruck.driver.sentimentScore}/100`);
      }
    }
    
    return true;
  } else {
    logError(`Failed to fetch enhanced fleet data: ${fleetResult.error}`);
    return false;
  }
}

async function testFleetSentimentStats() {
  logHeader('Testing Fleet Sentiment Statistics');
  
  const statsResult = await makeRequest('/api/sentiment/fleet/stats');
  
  if (statsResult.success) {
    logSuccess('Fleet sentiment statistics retrieved successfully');
    const stats = statsResult.data.fleetSentiment;
    log(`Total drivers with sentiment data: ${stats.totalDrivers}`);
    log(`Average fleet sentiment score: ${stats.averageScore}/100`);
    log('Sentiment distribution:');
    Object.entries(stats.distribution).forEach(([label, count]) => {
      log(`  ${label}: ${count} drivers`);
    });
    return true;
  } else {
    logError(`Failed to fetch fleet sentiment stats: ${statsResult.error}`);
    return false;
  }
}

async function runIntegrationTests() {
  log(`${colors.bold}${colors.blue}🚛 IndiFleet Integration Test Suite${colors.reset}\n`);
  log('This script will test the complete integration of sentiment analysis and fleet management.\n');
  
  const results = {
    serverConnection: false,
    sentimentAnalysis: false,
    fleetManagement: false,
    fleetStats: false
  };
  
  // Test server connection first
  results.serverConnection = await testServerConnection();
  
  if (!results.serverConnection) {
    logError('Aborting tests - server connection failed');
    return results;
  }
  
  // Run other tests
  results.sentimentAnalysis = await testSentimentAnalysis();
  results.fleetManagement = await testFleetManagement();
  results.fleetStats = await testFleetSentimentStats();
  
  // Summary
  logHeader('Test Results Summary');
  
  const testResults = [
    ['Server Connection', results.serverConnection],
    ['Sentiment Analysis', results.sentimentAnalysis],
    ['Fleet Management', results.fleetManagement],
    ['Fleet Statistics', results.fleetStats]
  ];
  
  testResults.forEach(([testName, passed]) => {
    if (passed) {
      logSuccess(`${testName}: PASSED`);
    } else {
      logError(`${testName}: FAILED`);
    }
  });
  
  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log(`\n${colors.bold}Overall Result: ${totalPassed}/${totalTests} tests passed${colors.reset}`);
  
  if (totalPassed === totalTests) {
    logSuccess('🎉 All integration tests passed! The system is ready for use.');
  } else {
    logWarning('⚠️  Some tests failed. Please check the error messages above.');
  }
  
  return results;
}

// Run the tests
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTests().catch(error => {
    logError(`Test suite failed with error: ${error.message}`);
    process.exit(1);
  });
}

export { runIntegrationTests };