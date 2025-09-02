import React from 'react';

const Services = () => {
  const keyFeatures = [
    {
      id: 1,
      title: 'Real-Time GPS Tracking',
      description: 'Monitor truck locations, routes, and statuses in real-time for full visibility.',
      image: '/src/assets/globe_.svg',
    },
    {
      id: 2,
      title: 'Capacity Utilization Monitoring',
      description: 'Ensure optimal load efficiency with real-time updates on truck capacity at each touchpoint.',
      image: '/src/assets/Vector.svg',
    },
    {
      id: 3,
      title: '3PL Partner Integration',
      description: 'Monetize unused capacity by seamlessly integrating with third-party logistics partners.',
      image: '/src/assets/processor.svg',
    },
    {
      id: 4,
      title: 'Automated Dispatch Scheduling',
      description: 'Automate scheduling and route adjustments based on live data and dynamic conditions.',
      image: '/src/assets/ep_location.svg',
    },
    {
      id: 5,
      title: 'Geofencing & Alerts',
      description: 'Receive instant alerts for route deviations, delays, or vehicle issues using geofencing technology.',
      image: '/src/assets/trend 1.svg',
    },
    {
      id: 6,
      title: 'Comprehensive Reports & Analytics',
      description: 'Generate visual reports on truck performance, delays, and capacity usage to make data-driven decisions.',
      image: '/src/assets/notification.svg',
    },
  ];

  const services = [
    {
      id: 1,
      title: 'Maximize Efficiency',
      description: 'Reduce downtime, improve capacity usage, and streamline your fleet management.',
      image: '/src/assets/efficacy.svg',
    },
    {
      id: 2,
      title: 'Real-Time Insights',
      description: 'Get real-time insights to make proactive decisions and stay ahead of potential disruptions.',
      image: '/src/assets/insight.svg',
    },
    {
      id: 3,
      title: 'End-to-End Automation',
      description: 'Automate dispatch, scheduling, and reporting for smooth and hassle-free fleet operations.',
      image: '/src/assets/travel.svg',
    },
  ];

  return (
    <div className="md:px-14 px-6 py-14 max-w-screen-2xl mx-auto">
      {/* Key Features - Split Grid with Blue Line */}
      <div className="py-4">
        <div className="md:w-1/2 mx-auto text-center mb-12">
          <h2 className="text-5xl text-brandPrimary font-bold mb-3">Key Features</h2>
        </div>
        <div className="mt-14 grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 md:w-11/12 mx-auto">
          {keyFeatures.map((service, index) => (
            <div
              key={service.id}
              className={`relative px-4 py-8 text-center w-64 h-[300px] mx-auto`}
            >
              {/* Icon/Image */}
              <div className="mb-4 h-16 w-16 mx-auto rounded-full flex items-center justify-center">
                <img src={service.image} alt={service.title} className="h-24 w-24" />
              </div>

              {/* Title */}
              <h4 className="text-xl font-bold text-brandPrimary mb-4">
                {service.title}
              </h4>

              {/* Description */}
              <p className="text-sm text-neutralGrey mb-2">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Choose IndiFleet Section */}
      <div className="py-14">
        <div className="md:w-1/2 mx-auto text-center mb-12">
          <h2 className="text-5xl text-brandPrimary font-bold mb-3">Why Choose Us</h2>
        </div>
        <div className="mt-14 grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 md:w-11/12 mx-auto gap-8">
          {services.map((service) => (
            <div
            key={service.id}
            className="relative group card bg-white border-2 border-neutralGrey rounded-2xl w-80 h-[300px] shadow-lg transition-all duration-300 ease-out overflow-visible px-4 py-8 text-center mx-auto hover:border-neutralDGrey hover:shadow-[0_4px_15px_0_rgba(242,146,31,0.5)]" // Adjust shadow color on hover
          >
            {/* Card Details */}
            <div className="card-details text-center flex flex-col items-center justify-center h-full space-y-4">
              <div className="mb-4 h-24 w-24 mx-auto rounded-full flex items-center justify-center">
                <img src={service.image} alt={service.title} className="h-20 w-20" />
              </div>
              <h4 className="text-title text-xl font-bold text-brandPrimary">{service.title}</h4>
              <p className="text-body text-neutralGrey">{service.description}</p>
            </div>
          
            {/* Button */}
            <button className="card-button absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full bg-neutralDGrey text-white px-6 py-2 rounded-lg opacity-0 group-hover:translate-y-1/2 group-hover:opacity-100 transition-transform duration-300 ease-out">
              More Info
            </button>
          </div>          
          ))}
        </div>
      </div>
    </div>
  );
};

export default Services;