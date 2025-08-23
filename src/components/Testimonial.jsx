import React, { useEffect, useState, useRef } from 'react';

const Testimonials = () => {
  const services = [
    {
      id: 1,
      target: 36,
      description: 'Improvement in capacity utilization across national routes',
    },
    {
      id: 2,
      target: 36,
      description: 'Improvement in capacity utilization across national routes',
    },
    {
      id: 3,
      target: 36,
      description: 'Improvement in capacity utilization across national routes',
    },
  ];

  const [counts, setCounts] = useState([0, 0, 0]);
  const [hasAnimated, setHasAnimated] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const animateNumber = (index, target) => {
      const duration = 4000;
      const stepTime = duration / target;

      const interval = setInterval(() => {
        setCounts((prevCounts) => {
          const newCounts = [...prevCounts];
          if (newCounts[index] < target) {
            newCounts[index] += 1;
          } else {
            clearInterval(interval);
          }
          return newCounts;
        });
      }, stepTime);
    };

    const handleIntersection = (entries) => {
      if (entries[0].isIntersecting && !hasAnimated) {
        services.forEach((service, index) => {
          animateNumber(index, service.target);
        });
        setHasAnimated(true);
      }
    };

    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 0.3,
    });

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [services, hasAnimated]);

  return (
    <div
      ref={sectionRef}
      className="md:px-14 px-6 py-8 max-w-screen-2xl mx-auto"
    >
      <div className="py-8">
        <div className="md:w-1/2 mx-auto text-center mb-12">
          <h2 className="text-5xl text-brandPrimary font-bold mb-3">The Numbers Speak for Themselves</h2>
        </div>
        <div className="mt-14 grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 md:w-11/12 mx-auto">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="relative px-4 py-8 text-center w-72 h-[300px] mx-auto"
            >
              <h4
                className={`text-6xl font-bold text-brandPrimary mb-4 transition-transform transform ease-out duration-500 ${
                  counts[index] > 0 ? 'scale-110 opacity-100' : 'opacity-0'
                }`}
              >
                {counts[index]}%
              </h4>
              <p className="text-sm text-brandPrimary font-semibold mb-2">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonials;