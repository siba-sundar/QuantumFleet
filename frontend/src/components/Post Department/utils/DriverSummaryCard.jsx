import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { DriverRepository } from '../../../repositories/DriverRepository.js';

const driverRepo = new DriverRepository();

export default function DriverSummaryCard({ driverId, truck }) {
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    // reset state on id change
    setLoading(true);
    setError('');
    setDriver(null);

    const load = async () => {
      if (!driverId) {
        if (!cancelled) {
          setError('No driver selected');
          setLoading(false);
        }
        return;
      }
      try {
        const data = await driverRepo.findById(driverId);
        if (cancelled) return;
        if (data) {
          setDriver(data);
        } else {
          setError('Driver not found');
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load driver');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [driverId]);

  if (loading) {
    return (
      <div className="bg-[#020073] text-white min-w-[260px] w-full p-6 rounded-md flex items-center justify-center shadow-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto"></div>
          <p className="mt-3 text-white/80 text-sm">Loading driver...</p>
        </div>
      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="bg-[#020073] text-white min-w-[260px] w-full p-6 rounded-md shadow-md">
        <p className="text-lg font-semibold mb-2">Driver Details</p>
        <p className="text-white/80 text-sm">{error || 'No data available'}</p>
      </div>
    );
  }

  const name = `${driver.personalInfo?.firstName || driver.name || ''} ${driver.personalInfo?.lastName || ''}`.trim() || 'N/A';
  const professional = driver.professionalInfo || {};
  // Extract route/start/destination info from enhanced truck list item
  const routeText = truck?.reservationSummary?.route || '';
  const [from, to] = routeText.includes('→') ? routeText.split('→').map(s => s.trim()) : [null, null];
  const pickupDate = truck?.reservationSummary?.pickupDate ? new Date(truck.reservationSummary.pickupDate) : null;
  const status = truck?.isReserved ? 'Reserved' : (truck?.status || null);
  const currentCity = truck?.currentLocation?.city;
  const currentState = truck?.currentLocation?.state;

  return (
    <div className="bg-[#020073] text-white min-w-[260px] w-full p-6 rounded-md shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
          <User className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="font-bold">{name}</p>
          <p className="text-white/80 text-sm">Employee ID: {professional.employeeId || '—'}</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="text-white/70">Assignment:</span> {professional.currentAssignment || 'Not assigned'}</p>
        <p><span className="text-white/70">Experience:</span> {professional.experience != null ? `${professional.experience} yrs` : '—'}</p>
        <p><span className="text-white/70">Truck ID:</span> {professional.truckId || '—'}</p>
        <p><span className="text-white/70">Department:</span> {professional.department || '—'}</p>
        <p><span className="text-white/70">Supervisor:</span> {professional.supervisor || '—'}</p>
        <p><span className="text-white/70">Phone:</span> {driver.phoneNumber || '—'}</p>
      </div>
      {routeText || status || currentCity ? (
        <div className="mt-4 pt-3 border-t border-white/20 space-y-1 text-sm break-words">
          <p className="text-white/90 font-semibold">Route</p>
          {from && to ? (
            <>
              <p><span className="text-white/70">From:</span> {from}</p>
              <p><span className="text-white/70">To:</span> {to}</p>
            </>
          ) : routeText ? (
            <p><span className="text-white/70">Path:</span> {routeText}</p>
          ) : null}
          {pickupDate && (
            <p><span className="text-white/70">Pickup:</span> {pickupDate.toLocaleDateString()}</p>
          )}
          {status && (
            <p><span className="text-white/70">Status:</span> {status}</p>
          )}
          {(currentCity || currentState) && (
            <p><span className="text-white/70">Current:</span> {currentCity}{currentState ? `, ${currentState}` : ''}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
