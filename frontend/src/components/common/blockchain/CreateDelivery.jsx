import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiCreateDelivery } from '../../../utils/blockchain_apis';
import { LoadingButton } from './LoadingButton';

export const CreateDelivery = () => {
  const [formData, setFormData] = useState({
    truckId: '',
    origin: '',
    destination: '',
    eta: '',
    payee: '',
    amount: ''
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
      const response = await apiCreateDelivery(formData);
      toast.success('Delivery created successfully! Order ID: ' + response.data.deliveryTx.id);
      setFormData({
        truckId: '',
        origin: '',
        destination: '',
        eta: '',
        payee: '',
        amount: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create delivery');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">Create Delivery</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Truck ID</label>
          <input
            type="text"
            name="truckId"
            value={formData.truckId}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Origin</label>
          <input
            type="text"
            name="origin"
            value={formData.origin}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Destination</label>
          <input
            type="text"
            name="destination"
            value={formData.destination}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">ETA</label>
          <input
            type="datetime-local"
            name="eta"
            value={formData.eta}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Payee Address</label>
          <input
            type="text"
            name="payee"
            value={formData.payee}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
            placeholder="0x..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Amount (ETH)</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            required
            step="0.001"
            min="0"
          />
        </div>

        <LoadingButton
          type="submit"
          isLoading={isLoading}
          className="w-full"
        >
          Create Delivery
        </LoadingButton>
      </form>
    </div>
  );
};
