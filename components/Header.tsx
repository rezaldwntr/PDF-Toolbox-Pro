import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-900/70 backdrop-blur-lg sticky top-0 z-50 border-b border-slate-700">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
          PDF Toolbox Pro
        </h1>
      </div>
    </header>
  );
};

export default Header;
