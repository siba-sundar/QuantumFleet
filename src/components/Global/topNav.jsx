import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // Import useAuth hook

// assets
import logo from "../../assets/logo1.svg";
import settingIcon from "../../assets/settings-icon.svg";
import contactIcon from "../../assets/contact-icon.svg";
import profileIcon from "../../assets/profile-icon.svg";

function TopNav({ options }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth(); // Get user and signOut from auth context
  
  // Set active option based on current path
  const getCurrentOptionFromPath = () => {
    const path = location.pathname;
    
    // Map paths to option names
    if (path.includes('track-truck')) return 'Track Your Truck';
    if (path.includes('truck-reservation')) return 'Truck Reservation';
    if (path.includes('fleet-dashboard')) return 'Fleet Dashboard';
    if (path.includes('gps-management')) return 'GPS Management';
    if (path.includes('mis-reports')) return 'MIS Reports';
    if (path.includes('company-details')) return 'Company Details';
    if (path.includes('truck-details')) return 'Truck Details';
    if (path.includes('driver-list')) return 'Driver List';
    if (path.includes('inbox')) return 'Inbox';
    if (path.includes('warehouse')) return 'Warehouse';
    if (path.includes('your-truck')) return 'Your Truck';
    if (path.includes('sentiment-analysis')) return 'Sentiment Analysis';
    if (path.includes('driver-details')) return 'Driver Details';
    
    // Default to first option if no match
    return options[0];
  };
  
  const [activeOption, setActiveOption] = useState(getCurrentOptionFromPath());
  
  // Update active option when location changes
  useEffect(() => {
    setActiveOption(getCurrentOptionFromPath());
  }, [location]);

  // Function to handle navigation when an option is clicked
  const handleOptionClick = (option) => {
    setActiveOption(option);
    
    // Create base path according to user type
    let basePath = '/';
    if (user?.userType === 'business') {
      basePath = '/business/';
    } else if (user?.userType === 'postal') {
      basePath = '/postal/'; // Super admin base path
    } else if (user?.userType === 'driver') {
      basePath = '/driver/';
    }
    
    // Map option to path
    switch (option) {
      // Business options
      case 'Track Your Truck':
        navigate(basePath + 'track-truck');
        break;
      case 'Truck Reservation':
        navigate(basePath + 'truck-reservation');
        break;
      case 'Fleet Dashboard':
        navigate(basePath + 'fleet-dashboard');
        break;
      case 'GPS Management':
        navigate(basePath + 'gps-management');
        break;
      case 'MIS Reports':
        navigate(basePath + 'mis-reports');
        break;
        
      // Postal options
      case 'Company Details':
        navigate(basePath + 'company-details');
        break;
      case 'Truck Details':
        navigate(basePath + 'truck-details');
        break;
      case 'Driver List':
        navigate(basePath + 'driver-list');
        break;
      case 'Inbox':
        navigate(basePath + 'inbox');
        break;
      case 'Warehouse':
        navigate(basePath + 'warehouse');
        break;
        
      // Driver options
      case 'Your Truck':
        navigate(basePath + 'your-truck');
        break;
      case 'Sentiment Analysis':
        navigate(basePath + 'sentiment-analysis');
        break;
      case 'Driver Details':
        navigate(basePath + 'driver-details');
        break;
        
      default:
        console.warn(`No route defined for option: ${option}`);
        break;
    }
  };

  // Function to handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get user type display name
  const getUserTypeDisplayName = () => {
    switch (user?.userType) {
      case 'business':
        return 'Business User';
      case 'postal':
        return 'Super Admin';
      case 'driver':
        return 'Truck Driver';
      default:
        return 'User';
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
        <div className="relative group">
          <div className="rounded-full w-[3rem] h-[3rem] cursor-pointer">
            <img src={profileIcon} alt="profile" className="w-[4rem]" />
          </div>
          {/* Dropdown menu with user info and sign out */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 hidden group-hover:block z-50">
            <div className="px-4 py-2 border-b">
              <p className="font-semibold text-gray-800">
                {user?.email || user?.phoneNumber || 'User'}
              </p>
              <p className="text-sm text-gray-600">
                {getUserTypeDisplayName()}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopNav;