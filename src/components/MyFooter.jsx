import React from 'react';
import { Footer } from 'flowbite-react';
import logo from '../assets/logo1_dark.png';

const MyFooter = () => {
  return (
    <Footer container>
      <div className="w-full">
        <div className="py-10 px-4 md:px-20 flex flex-col md:flex-row items-start md:items-center justify-between bg-brandPrimary">
          <div className="mb-4 md:mb-0">
            <a href="#" className='text-2xl font-semibold flex items-center space-x-3'>
              <img src={logo} alt="logo" className='w-44 md:w-56' />
            </a>
          </div>
          <div className="flex flex-wrap gap-8">
            <div>
              <Footer.Title title="About" className="text-neutralDGrey" />
              <Footer.LinkGroup col>
                <Footer.Link href="#" className="text-white">About Us</Footer.Link>
                <Footer.Link href="#" className="text-white">Terms of Use</Footer.Link>
              </Footer.LinkGroup>
            </div>
            <div>
              <Footer.Title title="Terms and Policies" className="text-neutralDGrey" />
              <Footer.LinkGroup col>
                <Footer.Link href="#" className="text-white">Privacy Policy</Footer.Link>
                <Footer.Link href="#" className="text-white">Hyperlink Policy</Footer.Link>
                <Footer.Link href="#" className="text-white">Website Policies</Footer.Link>
                <Footer.Link href="#" className="text-white">Content Policies</Footer.Link>
              </Footer.LinkGroup>
            </div>
            <div>
              <Footer.Title title="Resources" className="text-neutralDGrey" />
              <Footer.LinkGroup col>
                <Footer.Link href="#" className="text-white">Fees and User Charges</Footer.Link>
                <Footer.Link href="#" className="text-white">Act, Rule and Policies</Footer.Link>
                <Footer.Link href="#" className="text-white">Permit Fees</Footer.Link>
                <Footer.Link href="#" className="text-white">Manual</Footer.Link>
              </Footer.LinkGroup>
            </div>
            <div>
              <Footer.Title title="Need Help" className="text-neutralDGrey" />
              <Footer.LinkGroup col>
                <Footer.Link href="#" className="text-white">Contact Us</Footer.Link>
                <Footer.Link href="#" className="text-white">FAQ'S</Footer.Link>
                <Footer.Link href="#" className="text-white">Raise a Concern</Footer.Link>
                <Footer.Link href="#" className="text-white">Calendar</Footer.Link>
                <Footer.Link href="#" className="text-white">Web Information Manager</Footer.Link>
              </Footer.LinkGroup>
            </div>
          </div>
        </div>
        <hr />
        <div className="w-full bg-brandPrimary text-white py-4 text-center">
          <Footer.Copyright href="#" by="IndiFleet by AnomalyWatchers" year={2024} />
        </div>
        <Footer.Divider />
      </div>
    </Footer>
  );
};

export default MyFooter;