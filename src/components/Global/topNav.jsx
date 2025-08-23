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
      case 'Truck':
        navigate('/truck');
        break;

      case 'Third Party Logistics':
        navigate('/third-party-logistics');
        break;

      case 'Drivers':
        navigate('/drivers');
        break;


      case 'Warehouse':
        navigate('/warehouse');
        break;

      case 'Inbox':
        navigate('/inbox');
        break



      // for 3PL companies

      case 'Track Your Truck':
        navigate('/track-truck');
        break

      case 'Truck Reservation':
        navigate('/truck-reservation');
        break



      //Drivers

      case 'Your Truck':
        navigate('/your-truck');
        break;

      // Post Department / Company pages
      case 'Company Details':
        navigate('/company-details');
        break;

      case 'Truck Details':
        navigate('/truck-details');
        break;

      case 'Driver List':
        navigate('/driver-list');
        break;

      case 'Sentiment Analysis':
        navigate ('/analysis');
        break;

      default:
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
