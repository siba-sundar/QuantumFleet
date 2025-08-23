import { useState, useEffect } from 'react';
  // Import custom CSS for the scrollbar
import "./style.css"

function SideBar({ orders }) {
    const [filter, setFilter] = useState('All Orders');
    const [selectedOrder, setSelectedOrder] = useState(null);

    // Set the first order as selected by default
    useEffect(() => {
        if (orders.length > 0) {
            setSelectedOrder(orders[0].orderNumber);
        }
    }, [orders]);

    // Filter orders based on the selected status filter
    const filteredOrders = orders.filter((order) => filter === 'All Orders' || order.status === filter);

    return (
        <div>
            <div className="h-[calc(120vh)] w-[18vw] shadow-xl mt-4">

                {/* Scrollable Order List */}
                <div className="order-list overflow-y-auto h-[calc(100%-160px)] p-2">
                    {filteredOrders.map((order) => (
                        <div
                            key={order.orderNumber}
                            onClick={() => setSelectedOrder(order.orderNumber)} // Set selected order on click
                            className={`cursor-pointer p-4 mb-4 rounded-md shadow-md ${selectedOrder === order.orderNumber ? 'bg-[#020073] text-white' : 'bg-white text-black'}`}
                        >
                            <div className="flex gap-4">
                                
                                <div className="flex justify-between w-full">
                                    {/* Order Details */}
                                    <div>
                                        <p className="font-bold text-xs">Order No. {order.orderNumber}</p>
                                        <p className="text-xs">Delivered on: {order.deliveryDate}</p>
                                    </div>
                                    {/* Order Status */}
                                    <div className='pl-2'>
                                        <p className="text-xs font-semibold text-green-500">
                                            {order.status}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default SideBar;
