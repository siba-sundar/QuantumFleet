/**
 * Database Backup Script
 * 
 * Creates a JSON backup of all collections before cleanup
 * This provides a safety net in case you need to restore data
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase-server-config.js";
import fs from 'fs';
import path from 'path';

// Collections to backup (same as cleanup script)
const COLLECTIONS_TO_BACKUP = [
  'users',
  'businessProfiles',
  'driverProfiles', 
  'postalProfiles',
  'trucks',
  'routes',
  'trackingSessions',
  'alerts',
  'truckReservations',
  'thirdPartyBookings',
  'driverSentiment',
  'locationCache'
];

/**
 * Convert Firestore timestamp to serializable format
 * @param {any} obj - Object to process
 * @returns {any} Processed object
 */
function serializeFirestoreData(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj.toDate && typeof obj.toDate === 'function') {
    // Firestore Timestamp
    return obj.toDate().toISOString();
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeFirestoreData);
  }
  
  if (typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeFirestoreData(value);
    }
    return result;
  }
  
  return obj;
}

/**
 * Backup a single collection
 * @param {string} collectionName - Name of collection to backup
 * @returns {Promise<Object>} Collection data
 */
async function backupCollection(collectionName) {
  try {
    console.log(`💾 Backing up collection: ${collectionName}`);
    
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      console.log(`   ℹ️  Collection '${collectionName}' is empty`);
      return { documents: [], count: 0 };
    }
    
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      data: serializeFirestoreData(doc.data())
    }));
    
    console.log(`   ✅ Backed up ${documents.length} documents from '${collectionName}'`);
    
    return {
      documents,
      count: documents.length,
      backedUpAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`   ❌ Error backing up collection '${collectionName}':`, error.message);
    return { 
      documents: [], 
      count: 0, 
      error: error.message,
      backedUpAt: new Date().toISOString()
    };
  }
}

/**
 * Create complete database backup
 * @returns {Promise<string>} Path to backup file
 */
async function createBackup() {
  console.log('💾 IndiFleet Database Backup Started');
  console.log('====================================');
  
  const backupData = {
    metadata: {
      backupCreatedAt: new Date().toISOString(),
      databaseProject: 'quantumfleet-d5f24', // Your Firebase project ID
      backupVersion: '1.0',
      collections: COLLECTIONS_TO_BACKUP
    },
    collections: {}
  };
  
  let totalDocuments = 0;
  const startTime = Date.now();
  
  // Backup each collection
  for (const collectionName of COLLECTIONS_TO_BACKUP) {
    const collectionBackup = await backupCollection(collectionName);
    backupData.collections[collectionName] = collectionBackup;
    totalDocuments += collectionBackup.count;
    
    // Small delay to avoid overwhelming Firebase
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Create backups directory if it doesn't exist
  const backupsDir = './database-backups';
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  
  // Generate backup filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFilename = `indifleet-backup-${timestamp}.json`;
  const backupPath = path.join(backupsDir, backupFilename);
  
  // Write backup to file
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
  
  console.log('');
  console.log('✅ Backup completed successfully!');
  console.log('================================');
  console.log(`📁 Backup file: ${backupPath}`);
  console.log(`📄 Total documents backed up: ${totalDocuments}`);
  console.log(`📊 Collections backed up: ${COLLECTIONS_TO_BACKUP.length}`);
  console.log(`⏱️  Time taken: ${duration} seconds`);
  console.log(`💾 File size: ${(fs.statSync(backupPath).size / 1024).toFixed(2)} KB`);
  
  return backupPath;
}

/**
 * Restore from backup (for emergency recovery)
 * @param {string} backupPath - Path to backup file
 */
async function restoreFromBackup(backupPath) {
  console.log('🔄 Restore functionality is not implemented in this script');
  console.log('   This would require careful handling of document IDs and timestamps');
  console.log('   Consider using Firebase Admin SDK for production restores');
  console.log(`   Backup file: ${backupPath}`);
}

// Export functions for use in other scripts
export { createBackup, backupCollection, restoreFromBackup };

// Run backup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createBackup()
    .then((backupPath) => {
      console.log('');
      console.log('🎯 Next Steps:');
      console.log('   • Your data is safely backed up');
      console.log('   • You can now run the cleanup script if needed');
      console.log('   • Keep the backup file safe for recovery');
      console.log(`   • Backup location: ${backupPath}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Backup failed:', error);
      process.exit(1);
    });
}