import React from 'react';

interface CareerLogoProps {
  variant?: 'header' | 'footer';
}

export const CareerLogo: React.FC<CareerLogoProps> = ({ variant = 'header' }) => {
  const logoImage = (
    <div
      className={
        variant === 'header'
          ? 'relative overflow-hidden shrink-0 h-11 sm:h-13 aspect-[21/10]'
          : 'relative overflow-hidden shrink-0 h-12 sm:h-14 aspect-[21/10]'
      }
    >
      <img
        src="/assets/aistudio/Logooo-01_6f839a4d.png"
        alt="CareerToday Group - Be your hand, by your side"
        referrerPolicy="no-referrer"
        className="absolute max-w-none w-[136%] h-[285.6%] -left-[19.3%] -top-[90.8%] select-none pointer-events-none"
      />
    </div>
  );

  if (variant === 'footer') {
    return (
      <div className="inline-flex items-center bg-white rounded-2xl px-4 py-2.5 shadow-sm">
        {logoImage}
      </div>
    );
  }

  return logoImage;
};
