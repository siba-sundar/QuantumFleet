import React from 'react';
import { useNavigate } from 'react-router-dom';
import Image4 from '../../../assets/Image 4.svg';
import Image1 from '../../../assets/Image 1.svg';
import Image2 from '../../../assets/Image 2.svg';

const SignUpCard = () => {
  const navigate = useNavigate();
  const handleSignIn = () => {
    navigate('/signincard');
};

  return (
    <div className="h-screen flex justify-center items-center">
    <div className="w-full max-w-6xl mx-8 my-4 border-2 border-grey h-auto rounded-xl">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Left Side with Background and Text */}
        <div className="bg-brandPrimary flex flex-col items-start justify-center px-12 py-12 rounded-xl">
          <h1 className="text-white text-4xl font-bold mb-4">Join Us! How would you <br />like to sign up? </h1>
          <h3 className="font-semibold text-white text-lg">
            Please choose how you want <br /> to sign up.
          </h3>
        </div>
  
        {/* Right Side with Cards */}
        <div className="flex flex-col justify-center px-12 py-12">
          <div className="grid grid-cols-1 gap-8">
            {/* Card 1 */}
            <div
              className="bg-white shadow-md p-8 flex items-center cursor-pointer rounded-xl hover:shadow-lg hover:scale-105 transition duration-300"
              onClick={() => navigate('/signuptd')}
            >
              <img src={Image4} alt="Logo" className="w-16 h-16 mr-6" />
              <div>
                <h3 className="text-lg font-semibold">Truckers</h3>
              </div>
            </div>
  
            {/* Card 2 */}
            <div
              className="bg-white shadow-md p-8 flex items-center cursor-pointer rounded-xl hover:shadow-lg hover:scale-105 transition duration-300"
              onClick={() => navigate('/signupb')}
            >
              <img src={Image1} alt="Logo" className="w-16 h-16 mr-6" />
              <div>
                <h3 className="text-lg font-semibold">Business Partners</h3>
              </div>
            </div>
  
            {/* Card 3 */}
            <div
              className="bg-white shadow-md p-8 flex items-center cursor-pointer rounded-xl hover:shadow-lg hover:scale-105 transition duration-300"
              onClick={() => navigate('/signupp')}
            >
              <img src={Image2} alt="Logo" className="w-16 h-16 mr-6" />
              <div>
                <h3 className="text-lg font-semibold">Postal Department</h3>
              </div>
            </div>
            <div className="flex gap-2 text-center justify-center ">
                <h4>Already have an Account?</h4>
                <button className="font-semibold" onClick={handleSignIn}>
                Sign In
                </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  </div> 
  );
};

export default SignUpCard;