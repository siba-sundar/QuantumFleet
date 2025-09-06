import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiAssignCarrier } from '../../../utils/blockchain_apis';
import { LoadingButton } from './LoadingButton';

export const AssignCarrier = () => {
  const [formData, setFormData] = useState({
    orderId: '',
    carrierAddress: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiAssignCarrier(formData.orderId, formData.carrierAddress);
      toast.success('Carrier assigned successfully!');
      
      // Show escrow details in success message
      const escrow = response.data.escrowTx;
      if (escrow) {
        toast.success(`Escrow Info - Amount: ${escrow.amount} ETH, Status: ${escrow.status}`);
      }
      
      setFormData({
        orderId: '',
        carrierAddress: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign carrier');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">Assign Carrier</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Order ID</label>
          <input
            type="text"
            name="orderId"
            value={formData.orderId}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Carrier Address</label>
          <input
            type="text"
            name="carrierAddress"
            value={formData.carrierAddress}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
            placeholder="0x..."
          />
        </div>

        <LoadingButton
          type="submit"
          isLoading={isLoading}
          className="w-full"
        >
          Assign Carrier
        </LoadingButton>
      </form>
    </div>
  );
};
