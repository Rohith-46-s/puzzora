import React from 'react';

interface HeartsProps {
  hearts: number;
  maxHearts?: number;
}

/**
 * Hearts component - displays remaining hearts
 * Shows heart icons based on current hearts count
 */
export const Hearts: React.FC<HeartsProps> = ({ hearts, maxHearts = 5 }) => {
  const heartIcons = [];
  
  for (let i = 0; i < maxHearts; i++) {
    heartIcons.push(
      <span
        key={i}
        className={`text-2xl transition-all duration-300 ${
          i < hearts ? 'text-red-500' : 'text-gray-300'
        }`}
      >
        ♥
      </span>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      <span className="text-gray-700 font-semibold text-lg">Hearts</span>
      <div className="flex gap-1" aria-label={`${hearts} of ${maxHearts} hearts remaining`}>
        {heartIcons}
      </div>
    </div>
  );
};
