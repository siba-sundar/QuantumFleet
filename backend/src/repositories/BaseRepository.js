import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase.js';

export class BaseRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collection = collection(db, collectionName);
  }

  /**
   * Create a new document
   * @param {Object} data - The data to store
   * @returns {Promise<Object>} The created document with ID
   */
  async create(data) {
    try {
      const docRef = await addDoc(this.collection, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error(`Error creating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new document with a specific ID
   * @param {string} id - Document ID to use
   * @param {Object} data - The data to store
   * @returns {Promise<Object>} The created document with ID
   */
  async createWithId(id, data) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(docRef, docData);
      return { id, ...data };
    } catch (error) {
      console.error(`Error creating document with ID in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find a document by its ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} The document data or null if not found
   */
  async findById(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      console.error(`Error finding document by ID in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update a document by its ID
   * @param {string} id - Document ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} The updated document
   */
  async update(id, data) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      return { id, ...data };
    } catch (error) {
      console.error(`Error updating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document by its ID
   * @param {string} id - Document ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find documents based on conditions
   * @param {Array} conditions - Array of condition objects {field, operator, value}
   * @param {string} orderByField - Field to order by
   * @param {string} orderDirection - 'asc' or 'desc'
   * @param {number} limitCount - Number of documents to limit
   * @returns {Promise<Array>} Array of documents
   */
  async findWhere(conditions = [], orderByField = null, orderDirection = 'desc', limitCount = null) {
    try {
      let q = query(this.collection);
      
      // Apply where conditions
      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value));
      });
      
      // Apply ordering
      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection));
      }
      
      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error querying documents in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get all documents in the collection
   * @param {string} orderByField - Field to order by
   * @param {string} orderDirection - 'asc' or 'desc'
   * @param {number} limitCount - Number of documents to limit
   * @returns {Promise<Array>} Array of all documents
   */
  async findAll(orderByField = 'createdAt', orderDirection = 'desc', limitCount = null) {
    return this.findWhere([], orderByField, orderDirection, limitCount);
  }

  /**
   * Check if a document exists
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} True if document exists
   */
  async exists(id) {
    try {
      const document = await this.findById(id);
      return document !== null;
    } catch (error) {
      console.error(`Error checking if document exists in ${this.collectionName}:`, error);
      throw error;
    }
  }
}