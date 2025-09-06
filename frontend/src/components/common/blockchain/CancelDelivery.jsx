import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiCancelDelivery } from '../../../utils/blockchain_apis';
import { LoadingButton } from './LoadingButton';
import { AlertTriangle } from 'lucide-react';

export const CancelDelivery = () => {
  const [orderId, setOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiCancelDelivery(orderId);
      toast.success('Delivery cancelled successfully!');
      
      // Show refund confirmation
      if (response.data.refundTx) {
        toast.success('Escrow refunded to sender');
      }
      
      setOrderId('');
      setShowConfirm(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel delivery');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">Cancel Delivery</h2>
      
      {showConfirm && (
        <div className="p-4 mb-4 text-amber-800 bg-amber-100 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <span className="font-medium">Warning!</span>
          </div>
          <p>This will cancel the delivery and refund any locked escrow funds. This action cannot be undone.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Order ID</label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <LoadingButton
          type="submit"
          isLoading={isLoading}
          className={`w-full ${showConfirm ? 'bg-red-600 hover:bg-red-700' : ''}`}
        >
          {showConfirm ? 'Confirm Cancellation' : 'Cancel Delivery'}
        </LoadingButton>

        {showConfirm && (
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            className="w-full px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Back
          </button>
        )}
      </form>
    </div>
  );
};
