import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo1.png';
import { Link } from 'react-scroll';
import { FaXmark, FaBars, FaChevronDown, FaChevronUp } from 'react-icons/fa6';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);

  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleDropdown = (item) => {
    setOpenDropdown(openDropdown === item ? null : item);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navItems = [
    {
      link: 'Use Cases',
      path: 'useCases',
      dropdown: ['Logistics', 'Supply Chain', 'Transportation'],
    },
    {
      link: 'Resources',
      path: 'resources',
      dropdown: ['Whitepapers', 'Blog', 'Case Studies'],
    },
    {
      link: 'For Business',
      path: 'forBusiness',
      dropdown: ['Small Business', 'Enterprise', 'Startups'],
    },
    { link: 'Pricing', path: 'pricing' },
    { link: 'Contact Us', path: 'contactUs' },
  ];

  return (
    <header className="w-full fixed top-0 left-0 right-0 z-50">
      <nav
        className={`py-4 lg:px-14 px-4 transition-all duration-300 ${
          isSticky
            ? 'sticky top-0 left-0 right-0 border-b bg-white z-50'
            : 'bg-white md:bg-transparent'
        }`}
      >
        <div className="flex justify-between items-center text-base gap-8">
          <a href="#" className="text-2xl font-semibold flex items-center space-x-3">
            <img src={logo} alt="logo" className="w-32 inline-block items-center" />
          </a>

          {/* Main Nav Items */}
          <ul className="md:flex space-x-12 hidden">
            {navItems.map(({ link, path, dropdown }) => (
              <li key={path} className="relative group">
                <div
                  className="flex items-center cursor-pointer"
                  onClick={() => dropdown && toggleDropdown(link)} // Toggle dropdown on click
                >
                  <Link
                    to={path}
                    spy={true}
                    smooth={true}
                    offset={-100}
                    duration={500}
                    className="block transition-colors duration-300 font-bold group-hover:text-brandPrimary"
                  >
                    {link}
                  </Link>
                  {dropdown && (
                    <span
                      className={`ml-2 transition-transform duration-300 ${
                        openDropdown === link ? 'rotate-180' : ''
                      }`}
                    >
                      <FaChevronDown className="h-4 w-4" />
                    </span>
                  )}
                </div>

                {/* Dropdown Menu with Transition */}
                {dropdown && (
                  <ul
                    className={`absolute bg-white shadow-lg py-2 mt-2 rounded-md w-48 z-20 transition-all duration-300 ease-in-out ${
                      openDropdown === link
                        ? 'opacity-100 transform translate-y-0'
                        : 'opacity-0 transform -translate-y-2 pointer-events-none'
                    }`}
                  >
                    {dropdown.map((item) => (
                      <li key={item}>
                        <a
                          href="#"
                          className="block px-4 py-2 hover:bg-gray-100 text-sm text-brandPrimary transition-colors duration-300"
                        >
                          {item}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>

          {/* Buttons for large devices */}
          <div className="space-x-4 hidden lg:flex items-center">
            {/* Sign In Button */}
            <button
              onClick={() => navigate('/signincard')} // Navigate to SignIn component
              className="hidden lg:flex items-center bg-neutralDGrey text-white px-6 py-2 border-2 font-bold rounded-full transition-all duration-300 hover:drop-shadow-lg"
            >
              Sign In
            </button>
            {/* Sign Up Button */}
            <button
              onClick={() => navigate('/signupcard')} // Navigate to SignUp component
              className="bg-white text-brandPrimary px-6 py-2 border-2 border-neutralDGrey rounded-full font-bold transition-all duration-300 hover:text-white hover:bg-neutralDGrey hover:drop-shadow-lg"
            >
              Sign Up
            </button>
          </div>

          {/* Menu button for mobile */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="text-neutralDGrey focus:outline-none focus:text-gray-500"
            >
              {isMenuOpen ? (
                <FaXmark className="h-6 w-6 text-neutralDGrey" />
              ) : (
                <FaBars className="h-6 w-6 text-neutralDGrey" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav items */}
        <div
          className={`space-y-4 px-4 mt-16 py-7 bg-brandPrimary ${
            isMenuOpen ? 'block fixed top-0 right-0 left-0 z-50' : 'hidden'
          }`} // Added z-index to prevent overlapping
        >
          {navItems.map(({ link, path, dropdown }) => (
            <div key={path}>
              <div className="flex items-center justify-between">
                <Link
                  to={path}
                  spy={true}
                  smooth={true}
                  offset={-100}
                  duration={500}
                  className="block text-white hover:text-brandPrimary cursor-pointer transition-colors duration-300"
                  onClick={toggleMenu}
                >
                  {link}
                </Link>
                {dropdown && (
                  <button
                    className="ml-2 text-white focus:outline-none"
                    onClick={() => toggleDropdown(link)}
                  >
                    {openDropdown === link ? <FaChevronUp /> : <FaChevronDown />}
                  </button>
                )}
              </div>

              {/* Mobile Dropdown */}
              {dropdown && openDropdown === link && (
                <ul className="ml-4">
                  {dropdown.map((item) => (
                    <li key={item}>
                      <a href="#" className="block text-white hover:text-brandPrimary py-1 transition-colors duration-300">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;