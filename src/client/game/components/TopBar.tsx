import React from "react";

type TopBarProps = {
  showBack?: boolean;
  onBack?: () => void;
  subtitle?: string;
};

export const TopBar: React.FC<TopBarProps> = ({ showBack, onBack, subtitle }) => {
  return (
    <header className="pz-topbar">
      <div className="pz-topbar-row">
        {showBack && onBack && (
          <button
            type="button"
            className="pz-button pz-button--ghost pz-topbar-back"
            onClick={onBack}
          >
            ←
          </button>
        )}
        <div className="pz-topbar-text">
          <div className="pz-title">PUZZORA</div>
          <div className="pz-subtitle">
            {subtitle ?? "Solve image puzzles made by real people"}
          </div>
        </div>
      </div>
    </header>
  );
};

