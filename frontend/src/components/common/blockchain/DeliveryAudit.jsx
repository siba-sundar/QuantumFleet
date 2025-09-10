import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiGetDeliveryAudit } from '../../../utils/blockchain_apis';
import { LoadingButton } from './LoadingButton';
import { Package, Truck, MapPin, DollarSign, CheckCircle } from 'lucide-react';

export const DeliveryAudit = () => {
  const [orderId, setOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiGetDeliveryAudit(orderId);
      setAuditData(response.data);
      toast.success('Audit data retrieved successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to fetch delivery audit');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    const colors = {
      Created: 'bg-gray-100 text-gray-800',
      InTransit: 'bg-blue-100 text-blue-800',
      Delivered: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || colors.Created}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">Delivery Audit</h2>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex space-x-4">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-md"
            placeholder="Enter Order ID"
            required
          />
          <LoadingButton
            type="submit"
            isLoading={isLoading}
          >
            Fetch Audit
          </LoadingButton>
        </div>
      </form>

      {auditData && (
        <div className="space-y-6">
          {/* Delivery Details */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-3">
              <Package className="w-5 h-5 mr-2 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Delivery Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div className="mt-1">{renderStatusBadge(auditData.delivery.status)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Truck ID</p>
                <p className="mt-1 font-medium">{auditData.delivery.truckId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Origin</p>
                <p className="mt-1 font-medium">{auditData.delivery.origin}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Destination</p>
                <p className="mt-1 font-medium">{auditData.delivery.destination}</p>
              </div>
            </div>
          </div>

          {/* Escrow Details */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-3">
              <DollarSign className="w-5 h-5 mr-2 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Escrow Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="mt-1 font-medium">{auditData.escrow.amount} ETH</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="mt-1 font-medium">{auditData.escrow.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payee</p>
                <p className="mt-1 font-medium truncate">{auditData.escrow.payee}</p>
              </div>
            </div>
          </div>

          {/* Checkpoints */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center mb-3">
              <MapPin className="w-5 h-5 mr-2 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Proof of Delivery Checkpoints</h3>
            </div>
            <div className="space-y-4">
              {auditData.checkpoints.map((cp, index) => (
                <div key={index} className="flex items-start p-3 bg-white rounded-md">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-gray-600">
                      Location: {cp.latE6 / 1e6}, {cp.lonE6 / 1e6}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(cp.time * 1000).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Finalization Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className={`w-5 h-5 mr-2 ${auditData.finalized ? 'text-green-600' : 'text-gray-400'}`} />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Finalization Status</h3>
                <p className="text-sm text-gray-600">
                  {auditData.finalized ? 'Delivery has been finalized' : 'Delivery not yet finalized'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
