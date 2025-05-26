import { useEffect, useState } from "react";
import { River } from "../environment/River"; // Assuming River interface might be needed or for consistency

interface DissolvedOxygenDisplayProps {
  currentDO: number;
}

const DissolvedOxygenDisplay = ({ currentDO }: DissolvedOxygenDisplayProps) => {
  // Determine color based on DO level (example thresholds)
  const doColor =
    currentDO < 2 ? "#D32F2F" : currentDO < 4 ? "#FF9800" : "#4CAF50";

  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: "6px 12px",
        borderRadius: "15px",
        border: `2px solid ${doColor}`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        fontWeight: "bold",
        color: doColor,
        fontSize: "12px",
        whiteSpace: "nowrap",
      }}
    >
      💧 DO: {currentDO.toFixed(1)} mg/L
    </div>
  );
};

export default DissolvedOxygenDisplay;
