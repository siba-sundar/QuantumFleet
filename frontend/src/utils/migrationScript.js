/**
 * Migration Script to consolidate duplicate profiles and ensure UID-based document IDs
 * 
 * This script addresses the issue where users have multiple profile documents
 * with random IDs instead of a single document using their UID as the ID.
 * 
 * Usage: Run this script once to clean up existing data
 */

import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { db } from "./firebaseNode.js";

/**
 * Migrate business profiles to use UID as document ID
 */
export async function migrateBusinessProfiles() {
  console.log('Starting business profiles migration...');
  
  try {
    const collectionRef = collection(db, 'businessProfiles');
    const snapshot = await getDocs(collectionRef);
    
    const profilesByUID = new Map();
    const documentsToDelete = [];
    
    // Group profiles by UID and identify duplicates
    snapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      const uid = data.uid;
      
      if (!uid) {
        console.warn(`Document ${docId} has no UID, skipping...`);
        return;
      }
      
      if (!profilesByUID.has(uid)) {
        profilesByUID.set(uid, []);
      }
      
      profilesByUID.get(uid).push({
        id: docId,
        data: data
      });
    });
    
    // Process each UID group
    for (const [uid, profiles] of profilesByUID) {
      if (profiles.length === 1 && profiles[0].id === uid) {
        // Already correctly stored with UID as document ID
        console.log(`✓ Profile for UID ${uid} already correctly stored`);
        continue;
      }
      
      // Find the most complete/recent profile
      let bestProfile = profiles[0];
      for (const profile of profiles) {
        // Prefer profiles with more complete data or newer timestamps
        if (profile.data.updatedAt && (!bestProfile.data.updatedAt || 
            profile.data.updatedAt.seconds > bestProfile.data.updatedAt.seconds)) {
          bestProfile = profile;
        }
      }
      
      // Create/update the correct document with UID as ID
      const correctDocRef = doc(db, 'businessProfiles', uid);
      await setDoc(correctDocRef, bestProfile.data);
      console.log(`✓ Consolidated profile for UID ${uid}`);
      
      // Mark incorrect documents for deletion
      profiles.forEach(profile => {
        if (profile.id !== uid) {
          documentsToDelete.push({
            collection: 'businessProfiles',
            id: profile.id,
            uid: uid
          });
        }
      });
    }
    
    // Delete duplicate documents
    for (const docInfo of documentsToDelete) {
      const docRef = doc(db, docInfo.collection, docInfo.id);
      await deleteDoc(docRef);
      console.log(`✓ Deleted duplicate document ${docInfo.id} for UID ${docInfo.uid}`);
    }
    
    console.log(`Business profiles migration completed. Processed ${profilesByUID.size} unique users, deleted ${documentsToDelete.length} duplicates.`);
    
  } catch (error) {
    console.error('Error migrating business profiles:', error);
    throw error;
  }
}

/**
 * Migrate postal profiles to use UID as document ID
 */
export async function migratePostalProfiles() {
  console.log('Starting postal profiles migration...');
  
  try {
    const collectionRef = collection(db, 'postalProfiles');
    const snapshot = await getDocs(collectionRef);
    
    const profilesByUID = new Map();
    const documentsToDelete = [];
    
    // Group profiles by UID and identify duplicates
    snapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      const uid = data.uid;
      
      if (!uid) {
        console.warn(`Document ${docId} has no UID, skipping...`);
        return;
      }
      
      if (!profilesByUID.has(uid)) {
        profilesByUID.set(uid, []);
      }
      
      profilesByUID.get(uid).push({
        id: docId,
        data: data
      });
    });
    
    // Process each UID group
    for (const [uid, profiles] of profilesByUID) {
      if (profiles.length === 1 && profiles[0].id === uid) {
        // Already correctly stored with UID as document ID
        console.log(`✓ Profile for UID ${uid} already correctly stored`);
        continue;
      }
      
      // Find the most complete/recent profile
      let bestProfile = profiles[0];
      for (const profile of profiles) {
        // Prefer profiles with more complete data or newer timestamps
        if (profile.data.updatedAt && (!bestProfile.data.updatedAt || 
            profile.data.updatedAt.seconds > bestProfile.data.updatedAt.seconds)) {
          bestProfile = profile;
        }
      }
      
      // Create/update the correct document with UID as ID
      const correctDocRef = doc(db, 'postalProfiles', uid);
      await setDoc(correctDocRef, bestProfile.data);
      console.log(`✓ Consolidated profile for UID ${uid}`);
      
      // Mark incorrect documents for deletion
      profiles.forEach(profile => {
        if (profile.id !== uid) {
          documentsToDelete.push({
            collection: 'postalProfiles',
            id: profile.id,
            uid: uid
          });
        }
      });
    }
    
    // Delete duplicate documents
    for (const docInfo of documentsToDelete) {
      const docRef = doc(db, docInfo.collection, docInfo.id);
      await deleteDoc(docRef);
      console.log(`✓ Deleted duplicate document ${docInfo.id} for UID ${docInfo.uid}`);
    }
    
    console.log(`Postal profiles migration completed. Processed ${profilesByUID.size} unique users, deleted ${documentsToDelete.length} duplicates.`);
    
  } catch (error) {
    console.error('Error migrating postal profiles:', error);
    throw error;
  }
}

/**
 * Migrate driver profiles to use UID as document ID
 */
export async function migrateDriverProfiles() {
  console.log('Starting driver profiles migration...');
  
  try {
    const collectionRef = collection(db, 'driverProfiles');
    const snapshot = await getDocs(collectionRef);
    
    const profilesByUID = new Map();
    const documentsToDelete = [];
    
    // Group profiles by UID and identify duplicates
    snapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      const uid = data.uid;
      
      if (!uid) {
        console.warn(`Document ${docId} has no UID, skipping...`);
        return;
      }
      
      if (!profilesByUID.has(uid)) {
        profilesByUID.set(uid, []);
      }
      
      profilesByUID.get(uid).push({
        id: docId,
        data: data
      });
    });
    
    // Process each UID group
    for (const [uid, profiles] of profilesByUID) {
      if (profiles.length === 1 && profiles[0].id === uid) {
        // Already correctly stored with UID as document ID
        console.log(`✓ Profile for UID ${uid} already correctly stored`);
        continue;
      }
      
      // Find the most complete/recent profile
      let bestProfile = profiles[0];
      for (const profile of profiles) {
        // Prefer profiles with more complete data or newer timestamps
        if (profile.data.updatedAt && (!bestProfile.data.updatedAt || 
            profile.data.updatedAt.seconds > bestProfile.data.updatedAt.seconds)) {
          bestProfile = profile;
        }
      }
      
      // Create/update the correct document with UID as ID
      const correctDocRef = doc(db, 'driverProfiles', uid);
      await setDoc(correctDocRef, bestProfile.data);
      console.log(`✓ Consolidated profile for UID ${uid}`);
      
      // Mark incorrect documents for deletion
      profiles.forEach(profile => {
        if (profile.id !== uid) {
          documentsToDelete.push({
            collection: 'driverProfiles',
            id: profile.id,
            uid: uid
          });
        }
      });
    }
    
    // Delete duplicate documents
    for (const docInfo of documentsToDelete) {
      const docRef = doc(db, docInfo.collection, docInfo.id);
      await deleteDoc(docRef);
      console.log(`✓ Deleted duplicate document ${docInfo.id} for UID ${docInfo.uid}`);
    }
    
    console.log(`Driver profiles migration completed. Processed ${profilesByUID.size} unique users, deleted ${documentsToDelete.length} duplicates.`);
    
  } catch (error) {
    console.error('Error migrating driver profiles:', error);
    throw error;
  }
}

/**
 * Run all migrations
 */
export async function runAllMigrations() {
  console.log('🚀 Starting database migration to consolidate profiles...');
  
  try {
    await migrateBusinessProfiles();
    await migratePostalProfiles();
    await migrateDriverProfiles();
    
    console.log('✅ All migrations completed successfully!');
    console.log('📊 Summary: All user profiles now use UID as document ID for consistent data management.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Check for duplicate profiles without making changes
 */
export async function auditProfiles() {
  console.log('🔍 Auditing profiles for duplicates...');
  
  const collections = ['businessProfiles', 'postalProfiles', 'driverProfiles'];
  let totalDuplicates = 0;
  
  for (const collectionName of collections) {
    console.log(`\nAuditing ${collectionName}...`);
    
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    const profilesByUID = new Map();
    
    snapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const uid = data.uid;
      
      if (uid) {
        if (!profilesByUID.has(uid)) {
          profilesByUID.set(uid, []);
        }
        profilesByUID.get(uid).push(docSnapshot.id);
      }
    });
    
    let collectionDuplicates = 0;
    profilesByUID.forEach((docIds, uid) => {
      if (docIds.length > 1) {
        console.log(`  ⚠️  UID ${uid} has ${docIds.length} documents: ${docIds.join(', ')}`);
        collectionDuplicates += docIds.length - 1;
      }
    });
    
    console.log(`  Found ${collectionDuplicates} duplicate documents in ${collectionName}`);
    totalDuplicates += collectionDuplicates;
  }
  
  console.log(`\n📊 Total duplicates found: ${totalDuplicates}`);
  return totalDuplicates;
}