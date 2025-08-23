import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const OtpPageTD = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (value, index) => {
    if (value.length <= 1 && /^[0-9]*$/.test(value)) { 
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      // Automatically focus next input field
      if (value !== '' && index < otp.length - 1) {
        document.getElementById(`otp-${index + 1}`).focus();
      }
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '') {
        if (index > 0) {
          document.getElementById(`otp-${index - 1}`).focus();
          const newOtp = [...otp];
          newOtp[index - 1] = '';
          setOtp(newOtp);
        }
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handleOTPSubmit = (e) => {
    e.preventDefault();
    const otpValue = otp.join('');

    if (otpValue === '123456') {
      const next = location.state?.next || '/';
      // Pass phone forward if present
      navigate(next, { state: { phone: location.state?.phone } });
    } else {
      alert('Invalid OTP');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4">Enter 6-digit OTP</h2>
        <form onSubmit={handleOTPSubmit}>
          <div className="mb-6">
            <div className="flex justify-center space-x-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  className="w-12 h-12 text-center text-xl border border-black rounded-md focus:border-black focus:outline-none"
                  value={digit}
                  onChange={(e) => handleChange(e.target.value, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  required
                />
              ))}
            </div>
          </div>
          <div className="flex text-center justify-center mb-2">
                <button
                    type="submit"
                    className="w-44 bg-black text-white px-4 py-2 text-lg  font-semibold rounded-full hover:shadow-lg"
                >
                    Verify OTP
                </button>
            </div>
            <div className="flex text-center justify-center ">
                <button className="font-semibold">Resend OTP</button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default OtpPageTD;