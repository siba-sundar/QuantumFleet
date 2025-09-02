import React from 'react';
import { Truck, User, MapPin, Calendar } from 'lucide-react';

// Helpers to normalize DB data
const getTruckNumber = (t) => {
    const n = t?.number || t?.truckNumber || t?.truckId || t?.licensePlate || t?.plate || t?.id;
    return n || 'Truck';
};
const getDriverName = (t) => (
    t?.assignedDriver?.name || t?.driver?.name || t?.reservationSummary?.assignedDriver?.name ||
    (typeof t?.driver === 'string' ? t.driver : null) || 'Unassigned'
);
const statusPill = (s = '') => {
    const x = s.toLowerCase();
    if (x.includes('progress') || x.includes('transit')) return 'bg-amber-100 text-amber-700';
    if (x.includes('available') || x.includes('active')) return 'bg-emerald-100 text-emerald-700';
    if (x.includes('maintenance')) return 'bg-purple-100 text-purple-700';
    if (x.includes('delivered') || x.includes('completed') || x.includes('reserved')) return 'bg-blue-100 text-blue-700';
    if (x.includes('cancel')) return 'bg-rose-100 text-rose-700';
    return 'bg-gray-100 text-gray-700';
};

export default function TruckList({ trucks = [] }) {
    if (!Array.isArray(trucks)) trucks = [];
    return (
        <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {trucks.map((truck) => {
                    const number = getTruckNumber(truck);
                    const driver = getDriverName(truck);
                    const status = truck?.status || (truck?.isReserved ? 'Reserved' : '');
                    const route = truck?.reservationSummary?.route || truck?.route || '';
                    const pickupDate = truck?.reservationSummary?.pickupDate || truck?.pickupDate || null;
                    return (
                        <div key={truck.id || number} className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-4 flex items-start gap-3">
                                <div className="shrink-0 p-2 rounded-md bg-blue-50 text-blue-600">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold text-gray-800 truncate" title={number}>{number}</p>
                                        {status ? <span className={`text-xs px-2 py-0.5 rounded-full ${statusPill(status)}`}>{status}</span> : null}
                                    </div>
                                    <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        <span className="truncate" title={driver}>{driver}</span>
                                    </div>
                                    {route ? (
                                        <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span className="truncate" title={route}>{route}</span>
                                        </div>
                                    ) : null}
                                    {pickupDate ? (
                                        <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            <span>{new Date(pickupDate).toLocaleDateString()}</span>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            {trucks.length === 0 && (
                <div className="text-center text-gray-500 py-8">No active trucks to display.</div>
            )}
        </div>
    );
}
