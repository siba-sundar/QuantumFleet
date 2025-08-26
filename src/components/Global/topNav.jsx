import { useState } from 'react';
import { useNavigate } from 'react-router-dom';  // Import useNavigate for routing

// assets
import logo from "../../assets/logo1.svg";
import settingIcon from "../../assets/settings-icon.svg";
import contactIcon from "../../assets/contact-icon.svg";
import profileIcon from "../../assets/profile-icon.svg";

function TopNav({ options }) {
  const [activeOption, setActiveOption] = useState(options[0]);
  const navigate = useNavigate();  // Initialize the navigation hook

  // Function to handle navigation when an option is clicked
  const handleOptionClick = (option) => {
    setActiveOption(option);

    // Define the routes corresponding to each option
    switch (option) {
      // Business Routes
      case 'Track Your Truck':
        navigate('/business/track-truck');
        break;

      case 'Truck Reservation':
        navigate('/business/truck-reservation');
        break;

      case 'Fleet Dashboard':
        // Check context for appropriate fleet dashboard
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/postal/')) {
          navigate('/postal/fleet-dashboard');
        } else {
          navigate('/business/fleet-dashboard');
        }
        break;

      case 'GPS Management':
        navigate('/business/gps-management');
        break;

      case 'MIS Reports':
        // Check context for appropriate MIS reports
        const path = window.location.pathname;
        if (path.startsWith('/postal/')) {
          navigate('/postal/mis-reports');
        } else {
          navigate('/business/mis-reports');
        }
        break;

      // Postal Department Routes
      case 'Company Details':
        navigate('/postal/company-details');
        break;

      case 'Truck Details':
        navigate('/postal/truck-details');
        break;

      case 'Driver List':
        navigate('/postal/driver-list');
        break;

      case 'Inbox':
        navigate('/postal/inbox');
        break;

      case 'Warehouse':
        navigate('/postal/warehouse');
        break;

      // Driver Routes
      case 'Your Truck':
        navigate('/driver/your-truck');
        break;

      case 'Sentiment Analysis':
        navigate('/driver/sentiment-analysis');
        break;

      case 'Driver Details':
        navigate('/driver/driver-details');
        break;

      // Legacy routes (for backward compatibility)
      case 'Truck':
        navigate('/business/track-truck');
        break;

      case 'Third Party Logistics':
        navigate('/business/truck-reservation');
        break;

      case 'Drivers':
        navigate('/postal/driver-list');
        break;

      default:
        console.warn(`No route defined for option: ${option}`);
        break;
    }
  };

  return (
    <div className="grid grid-cols-[20%_60%_20%] px-2">
      <div className="flex justify-center items-center">
        <img src={logo} alt="logo" className="w-[7rem] mt-[2px]" />
      </div>

      {/* Options */}
      <ul className="flex items-center justify-center gap-5">
        {options.map((option, index) => (
          <li
            key={index}
            className={`font-semibold text-sm px-8 border-2 border-[#020073] shadow-xl py-2 rounded-xl cursor-pointer transition duration-300 ${activeOption === option ? 'bg-[#020073] text-white' : 'bg-white text-black'
              }`}
            onClick={() => handleOptionClick(option)}  // Handle the click and navigate
          >
            {option}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-center gap-5">
        <img src={settingIcon} alt="settings" className="w-6" />
        <img src={contactIcon} alt="contact" className="w-6" />
        <div className="rounded-full w-[3rem] h-[3rem]">
          <img src={profileIcon} alt="profile" className="w-[4rem]" />
        </div>
      </div>
    </div>
  );
}

export default TopNav;
