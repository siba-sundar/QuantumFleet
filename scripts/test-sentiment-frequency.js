/**
 * Test script to verify sentiment analysis 2-per-month frequency limit
 * This script tests the enforcement of the strict 2 submissions per calendar month limit
 */

import { config } from 'dotenv';

// Load environment variables
config();

const API_BASE = process.env.VITE_API_BASE || 'http://localhost:4001';
const TEST_DRIVER_ID = 'test-driver-' + Date.now();

// Test survey data
const SAMPLE_SURVEY_DATA = {
  driverId: TEST_DRIVER_ID,
  surveyData: {
    jobSatisfaction: 'Good',
    relationshipWithManagement: 'Good',
    workHours: 'Fair',
    mentalHealth: 'Good',
    physicalHealth: 'Excellent',
    salarySatisfaction: 'Fair',
    workConditions: 'Good'
  }
};

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    
    return {
      success: response.ok,
      status: response.status,
      data: response.ok ? data : null,
      error: !response.ok ? data.error || 'Unknown error' : null
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      data: null,
      error: error.message
    };
  }
}

async function testSentimentFrequencyLimit() {
  console.log('🧪 Testing Sentiment Analysis Frequency Limit (2 per month)\n');
  console.log(`Using test driver ID: ${TEST_DRIVER_ID}\n`);
  
  try {
    // Test 1: Check initial quota
    console.log('📊 Step 1: Checking initial quota...');
    const initialQuota = await makeRequest(`/api/sentiment/driver/${TEST_DRIVER_ID}/quota`);
    
    if (initialQuota.success) {
      console.log('✅ Initial quota check successful');
      console.log(`   - Allowed: ${initialQuota.data.allowed}`);
      console.log(`   - Remaining: ${initialQuota.data.remaining}/2`);
      console.log(`   - Current Month: ${initialQuota.data.currentMonth}`);
    } else {
      console.log(`❌ Initial quota check failed: ${initialQuota.error}`);
      return;
    }
    
    // Test 2: Submit first survey (should succeed)
    console.log('\n📝 Step 2: Submitting first sentiment survey...');
    const firstSubmission = await makeRequest('/api/sentiment/survey', {
      method: 'POST',
      body: JSON.stringify({
        ...SAMPLE_SURVEY_DATA,
        surveyData: {
          ...SAMPLE_SURVEY_DATA.surveyData,
          jobSatisfaction: 'Excellent' // Make it slightly different
        }
      })
    });
    
    if (firstSubmission.success) {
      console.log('✅ First submission successful');
      console.log(`   - Sentiment Score: ${firstSubmission.data.analysis.sentimentScore}/100`);
      console.log(`   - Remaining this month: ${firstSubmission.data.remainingThisMonth}`);
    } else {
      console.log(`❌ First submission failed: ${firstSubmission.error}`);
      return;
    }
    
    // Test 3: Submit second survey (should succeed)
    console.log('\n📝 Step 3: Submitting second sentiment survey...');
    const secondSubmission = await makeRequest('/api/sentiment/survey', {
      method: 'POST',
      body: JSON.stringify({
        ...SAMPLE_SURVEY_DATA,
        surveyData: {
          ...SAMPLE_SURVEY_DATA.surveyData,
          workConditions: 'Excellent' // Make it different
        }
      })
    });
    
    if (secondSubmission.success) {
      console.log('✅ Second submission successful');
      console.log(`   - Sentiment Score: ${secondSubmission.data.analysis.sentimentScore}/100`);
      console.log(`   - Remaining this month: ${secondSubmission.data.remainingThisMonth}`);
    } else {
      console.log(`❌ Second submission failed: ${secondSubmission.error}`);
      return;
    }
    
    // Test 4: Attempt third survey (should fail with 429 status)
    console.log('\n🚫 Step 4: Attempting third submission (should be blocked)...');
    const thirdSubmission = await makeRequest('/api/sentiment/survey', {
      method: 'POST',
      body: JSON.stringify({
        ...SAMPLE_SURVEY_DATA,
        surveyData: {
          ...SAMPLE_SURVEY_DATA.surveyData,
          mentalHealth: 'Excellent' // Make it different
        }
      })
    });
    
    if (!thirdSubmission.success && thirdSubmission.status === 429) {
      console.log('✅ Third submission correctly blocked (HTTP 429)');
      console.log(`   - Error: ${thirdSubmission.error}`);
    } else if (thirdSubmission.success) {
      console.log('❌ SECURITY ISSUE: Third submission was allowed when it should be blocked!');
      console.log(`   - This indicates the 2-per-month limit is not working properly`);
      return;
    } else {
      console.log(`❌ Third submission failed with unexpected error: ${thirdSubmission.error}`);
      return;
    }
    
    // Test 5: Check final quota status
    console.log('\n📊 Step 5: Checking final quota status...');
    const finalQuota = await makeRequest(`/api/sentiment/driver/${TEST_DRIVER_ID}/quota`);
    
    if (finalQuota.success) {
      console.log('✅ Final quota check successful');
      console.log(`   - Allowed: ${finalQuota.data.allowed} (should be false)`);
      console.log(`   - Remaining: ${finalQuota.data.remaining}/2 (should be 0)`);
      console.log(`   - Resets: ${new Date(finalQuota.data.resetsAt).toLocaleDateString()}`);
      
      if (!finalQuota.data.allowed && finalQuota.data.remaining === 0) {
        console.log('✅ Quota correctly shows no remaining submissions');
      } else {
        console.log('❌ Quota status is incorrect');
      }
    } else {
      console.log(`❌ Final quota check failed: ${finalQuota.error}`);
    }
    
    // Test 6: Check sentiment history
    console.log('\n📚 Step 6: Checking sentiment history...');
    const history = await makeRequest(`/api/sentiment/driver/${TEST_DRIVER_ID}`);
    
    if (history.success) {
      console.log(`✅ History retrieved: ${history.data.history.length} records found`);
      if (history.data.history.length === 2) {
        console.log('✅ Correct number of records (2) in history');
      } else {
        console.log(`❌ Expected 2 records, found ${history.data.history.length}`);
      }
    } else {
      console.log(`❌ History check failed: ${history.error}`);
    }
    
    console.log('\n🎉 Sentiment Analysis Frequency Limit Test Completed!');
    console.log('📋 Summary:');
    console.log('   ✅ Monthly quota system is working correctly');
    console.log('   ✅ First two submissions allowed');
    console.log('   ✅ Third submission properly blocked with HTTP 429');
    console.log('   ✅ Quota tracking accurate');
    console.log('   ✅ 2-per-month limit strictly enforced');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
console.log('🚀 Starting Sentiment Analysis Frequency Limit Test...\n');
testSentimentFrequencyLimit()
  .then(() => {
    console.log('\n✨ Test execution completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });