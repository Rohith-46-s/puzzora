import React from "react";

type HeartsProps = {
  hearts: number;
  maxHearts: number;
};

export const Hearts: React.FC<HeartsProps> = ({ hearts, maxHearts }) => {
  const safeMax = maxHearts > 0 ? maxHearts : 0;
  const safeHearts = Math.max(0, Math.min(hearts, safeMax));

  return (
    <div className="pz-hearts">
      {Array.from({ length: safeMax }).map((_, index) => {
        const filled = index < safeHearts;
        return (
          <span
            key={index}
            className={filled ? "pz-heart pz-heart--full" : "pz-heart pz-heart--empty"}
          >
            ♥
          </span>
        );
      })}
    </div>
  );
};

