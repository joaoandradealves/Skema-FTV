import React from 'react';

interface WavyBackgroundProps {
  children: React.ReactNode;
  topHeight?: string; // e.g. "30%", "40vh"
  bgColor?: string;
  dividerColor?: string;
}

export default function WavyBackground({ 
  children, 
  topHeight = "35%", 
  bgColor = "bg-surface", 
  dividerColor = "fill-surface" 
}: WavyBackgroundProps) {
  return (
    <div className={`relative min-h-screen w-full font-body text-on-surface overflow-x-hidden ${bgColor}`}>
      {/* Top Teal Section */}
      <div 
        className="absolute top-0 left-0 w-full bg-primary-container z-0" 
        style={{ height: topHeight }}
      ></div>

      {/* Wavy Divider - Preenchimento igual à bg-surface (cor areia) */}
      <div 
        className="absolute left-0 w-full transform -translate-y-1/2 z-10"
        style={{ top: topHeight }}
      >
        <svg 
            className={`w-full ${dividerColor}`} 
            viewBox="0 0 1440 320" 
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
        >
          <path d="M0,192L48,197.3C96,203,192,213,288,197.3C384,181,480,139,576,138.7C672,139,768,181,864,197.3C960,213,1056,203,1152,186.7C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-20 w-full min-h-screen">
        {children}
      </div>
    </div>
  );
}
