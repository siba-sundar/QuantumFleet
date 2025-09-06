import express from 'express';
import { getRouteDetails } from '../services/routesService.js';
import { db } from '../config/firebase.js';
import { collection, addDoc } from 'firebase/firestore';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { truckId, origin, destination, intermediates } = req.body;

    if (!truckId || !origin || !destination) {
      return res.status(400).json({ message: 'truckId, origin, and destination are required' });
    }

    const routes_data = await getRouteDetails({ origin, destination, intermediates });

    const reservationData = {
      truckId,
      ...routes_data,
      createdAt: new Date(),
    };

    console.log('Attempting to create reservation with data:', JSON.stringify(reservationData, null, 2));
    // Use Firestore modular SDK to add document
    const docRef = await addDoc(collection(db, 'truckreservation'), reservationData);

    res.status(201).json({ message: 'Reservation created successfully', reservationId: docRef.id });
  } catch (error) {
    console.error('Error creating reservation:', error);
    console.error('Firestore Error Details:', JSON.stringify(error, null, 2));
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

export default router;