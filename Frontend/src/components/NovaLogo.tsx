import React from 'react';
import logoImg from '../assets/nova-logo.png';

export interface NovaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero' | number;
  className?: string;
}

export const NovaLogo: React.FC<NovaLogoProps> = ({ size = 'md', className = '' }) => {
  let sizeClass = '';
  let pixelSize: number | undefined = undefined;
  
  if (typeof size === 'number') {
    pixelSize = size;
  } else {
    switch (size) {
      case 'sm':
        sizeClass = 'w-[44px] h-[44px]'; // Collapsed sidebar / small
        break;
      case 'md':
        sizeClass = 'w-[42px] h-[42px] sm:w-[52px] sm:h-[52px]'; // Navbar / Sidebar default
        break;
      case 'lg':
        sizeClass = 'w-[64px] h-[64px]'; // Login screen
        break;
      case 'hero':
        sizeClass = 'w-[80px] h-[80px] sm:w-[96px] sm:h-[96px]'; // Hero area
        break;
      default:
        sizeClass = 'w-[42px] h-[42px] sm:w-[52px] sm:h-[52px]';
    }
  }

  return (
    <img 
      src={logoImg} 
      alt="NOVA Logo" 
      style={pixelSize ? { width: pixelSize, height: pixelSize } : undefined}
      className={`object-contain ${sizeClass} ${className}`.trim()} 
    />
  );
};
