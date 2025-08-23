import React from "react";

const OrderConfirmation = () => {
  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center">
      <div className="bg-white max-w-lg mx-auto p-5 border border-gray-300 rounded-lg">
        <div className="mb-5">
          <h1 className="text-xl font-bold">
            Shyam Lal <span className="text-gray-500">&lt;HP06B4567&gt;</span>
          </h1>
          <p className="text-gray-600">17 Aug 2024, 20:04</p>
          <hr className="my-4" />
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-blue-600">Booking Confirmation</h2>
          <p className="mt-2">Dear Shyam Lal,</p>
          <p className="mt-1">
            We thank you for booking your truck in IndiFleet. Your truck has been
            successfully booked and the booking details are indicated below.
          </p>
          <p className="mt-2 text-lg font-bold text-blue-600">Booking ID: 3816</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Order details:</h3>
          <table className="table-auto w-full border-collapse">
            <tbody>
              <tr>
                <th className="border px-4 py-2 bg-gray-100">Booking No</th>
                <td className="border px-4 py-2">1768541837</td>
                <th className="border px-4 py-2 bg-gray-100">R/C No</th>
                <td className="border px-4 py-2">4614661545</td>
              </tr>
              <tr>
                <th className="border px-4 py-2 bg-gray-100">Mobile No</th>
                <td className="border px-4 py-2">6306441496</td>
                <th className="border px-4 py-2 bg-gray-100">Truck No</th>
                <td className="border px-4 py-2">16093</td>
              </tr>
              <tr>
                <th className="border px-4 py-2 bg-gray-100">Booking Date</th>
                <td className="border px-4 py-2">17-08-2024</td>
                <th className="border px-4 py-2 bg-gray-100">Booking Time</th>
                <td className="border px-4 py-2">30 Days</td>
              </tr>
              <tr>
                <th className="border px-4 py-2 bg-gray-100">Payment Status</th>
                <td className="border px-4 py-2">Received</td>
                <th className="border px-4 py-2 bg-gray-100">Payment Remaining</th>
                <td className="border px-4 py-2">50%</td>
              </tr>
              <tr>
                <th className="border px-4 py-2 bg-gray-100">Delivery Location</th>
                <td className="border px-4 py-2">BALHARSAH (BPQ)</td>
                <th className="border px-4 py-2 bg-gray-100">Delivery Time</th>
                <td className="border px-4 py-2">22:35</td>
              </tr>
              <tr>
                <th className="border px-4 py-2 bg-gray-100">Pick Up Agent</th>
                <td className="border px-4 py-2">Satya Pal</td>
                <th className="border px-4 py-2 bg-gray-100">Agent Contact</th>
                <td className="border px-4 py-2">8459332797</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
