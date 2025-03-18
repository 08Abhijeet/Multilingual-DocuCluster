import React from 'react';
import { Link } from 'react-router-dom';
import { MdEditDocument } from "react-icons/md";

function Navbar() {
  const handleLogoClick = () => {
    window.location.reload();  // Reload the page when the logo or name is clicked
  };

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <MdEditDocument 
            size={40} 
            className="text-white cursor-pointer" 
            onClick={handleLogoClick} 
          />
          <Link to="/" className="text-2xl font-bold cursor-pointer" onClick={handleLogoClick}>
            DocCluster
          </Link>
        </div>
        <div className="space-x-4">
          <Link to="/" className="hover:text-blue-200">
            Home
          </Link>
          <Link to="/about" className="hover:text-blue-200">
            About
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
