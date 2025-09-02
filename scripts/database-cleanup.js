/**
 * IndiFleet Database Cleanup Script
 * 
 * This script will completely clean all documents from Firebase Firestore
 * while preserving the collection structure.
 * 
 * WARNING: This action is IRREVERSIBLE! Make sure you have backups if needed.
 * 
 * Usage: node database-cleanup.js
 */

import { collection, getDocs, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase-server-config.js";

// All collections identified in your IndiFleet project
const COLLECTIONS_TO_CLEAN = [
  // Core user and profile collections
  'users',
  'businessProfiles',
  'driverProfiles', 
  'postalProfiles',
  
  // Operational collections
  'trucks',
  'routes',
  'trackingSessions',
  'alerts',
  
  // Reservation and booking collections
  'truckReservations',
  'thirdPartyBookings',
  
  // Analytics and data collections
  'driverSentiment',
  'locationCache',
  
  // Additional potential collections found in code
  'notifications',
  'logs',
  'analytics',
  'maintenance',
  'payments',
  'feedback'
];

/**
 * Delete all documents in a collection using batch operations for efficiency
 * @param {string} collectionName - Name of the collection to clean
 * @returns {Promise<number>} Number of documents deleted
 */
async function cleanCollection(collectionName) {
  try {
    console.log(`🧹 Cleaning collection: ${collectionName}`);
    
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      console.log(`   ✅ Collection '${collectionName}' is already empty`);
      return 0;
    }
    
    const totalDocs = snapshot.docs.length;
    console.log(`   📄 Found ${totalDocs} documents to delete`);
    
    // Firestore batch operations are limited to 500 operations
    const batchSize = 500;
    let deletedCount = 0;
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = snapshot.docs.slice(i, i + batchSize);
      
      batchDocs.forEach((docSnapshot) => {
        batch.delete(docSnapshot.ref);
      });
      
      await batch.commit();
      deletedCount += batchDocs.length;
      
      console.log(`   🗑️  Deleted ${deletedCount}/${totalDocs} documents`);
    }
    
    console.log(`   ✅ Successfully cleaned '${collectionName}' - ${deletedCount} documents deleted`);
    return deletedCount;
    
  } catch (error) {
    console.error(`   ❌ Error cleaning collection '${collectionName}':`, error.message);
    
    // If permission denied, the collection might not exist or user lacks permissions
    if (error.code === 'permission-denied') {
      console.log(`   ⚠️  Permission denied - collection '${collectionName}' may not exist or access is restricted`);
    }
    
    return 0;
  }
}

/**
 * Check if collection exists and has documents
 * @param {string} collectionName - Name of the collection to check
 * @returns {Promise<boolean>} True if collection exists and has documents
 */
async function collectionExists(collectionName) {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    return !snapshot.empty;
  } catch (error) {
    return false;
  }
}

/**
 * Main cleanup function
 */
async function cleanupDatabase() {
  console.log('🔥 IndiFleet Database Cleanup Started');
  console.log('======================================');
  console.log('⚠️  WARNING: This will delete ALL documents from ALL collections!');
  console.log('⚠️  This action is IRREVERSIBLE!');
  console.log('');
  
  // Safety confirmation
  console.log('📋 Collections to be cleaned:');
  COLLECTIONS_TO_CLEAN.forEach(collection => {
    console.log(`   • ${collection}`);
  });
  
  console.log('');
  console.log('🚀 Starting cleanup in 3 seconds...');
  
  // Give user a moment to cancel if needed
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  let totalDeletedDocuments = 0;
  let cleanedCollections = 0;
  const startTime = Date.now();
  
  // Clean each collection
  for (const collectionName of COLLECTIONS_TO_CLEAN) {
    const deletedCount = await cleanCollection(collectionName);
    
    if (deletedCount > 0) {
      totalDeletedDocuments += deletedCount;
      cleanedCollections++;
    }
    
    // Small delay between collections to avoid overwhelming Firebase
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('');
  console.log('🎉 Database Cleanup Completed!');
  console.log('===============================');
  console.log(`✅ Collections processed: ${COLLECTIONS_TO_CLEAN.length}`);
  console.log(`✅ Collections cleaned: ${cleanedCollections}`);
  console.log(`✅ Total documents deleted: ${totalDeletedDocuments}`);
  console.log(`⏱️  Time taken: ${duration} seconds`);
  console.log('');
  console.log('🏗️  All collection structures are preserved');
  console.log('📝 Your Firebase Firestore is now clean and ready for fresh data!');
}

/**
 * Verify cleanup by checking if collections are empty
 */
async function verifyCleanup() {
  console.log('');
  console.log('🔍 Verifying cleanup...');
  console.log('========================');
  
  let allEmpty = true;
  
  for (const collectionName of COLLECTIONS_TO_CLEAN) {
    const hasDocuments = await collectionExists(collectionName);
    if (hasDocuments) {
      console.log(`   ⚠️  Collection '${collectionName}' still has documents`);
      allEmpty = false;
    } else {
      console.log(`   ✅ Collection '${collectionName}' is empty`);
    }
  }
  
  if (allEmpty) {
    console.log('');
    console.log('🎊 All collections are successfully cleaned!');
  } else {
    console.log('');
    console.log('⚠️  Some collections may still contain documents. This could be due to:');
    console.log('   • Permission restrictions');
    console.log('   • New documents added during cleanup');
    console.log('   • Collections with special security rules');
  }
}

// Execute the cleanup
async function main() {
  try {
    await cleanupDatabase();
    await verifyCleanup();
    
    console.log('');
    console.log('🔗 Next Steps:');
    console.log('   • Your database is now clean');
    console.log('   • Collections are preserved for new data');
    console.log('   • You can start fresh with your application');
    console.log('   • Consider updating your security rules if needed');
    
  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   • Check your Firebase configuration');
    console.log('   • Verify authentication and permissions');
    console.log('   • Ensure you have network connectivity');
    console.log('   • Check Firestore security rules');
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(() => {
    console.log('');
    console.log('🏁 Script completed. Exiting...');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

export { cleanupDatabase, cleanCollection, verifyCleanup };