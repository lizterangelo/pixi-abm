import { useEffect, useState } from "react";
import { River } from "../environment/River"; // Assuming River interface might be needed or for consistency

interface DissolvedOxygenDisplayProps {
  currentDO: number;
}

const DissolvedOxygenDisplay = ({ currentDO }: DissolvedOxygenDisplayProps) => {
  // Determine color based on DO level (example thresholds)
  const doColor = currentDO < 2 ? "#D32F2F" : currentDO < 4 ? "#FF9800" : "#4CAF50";

  return (
    <div style={{
      position: "absolute",
      top: "170px", // Positioned below DayDisplay (Nutrients: 10px, Pollution: 50px, Tick: 90px, Day: 130px)
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      padding: "8px 16px",
      borderRadius: "20px",
      border: `2px solid ${doColor}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      zIndex: 1001,
      fontWeight: "bold",
      color: doColor,
      fontSize: "12px"
    }}>
      💧 Dissolved Oxygen: {currentDO.toFixed(2)} mg/L
    </div>
  );
};

export default DissolvedOxygenDisplay; 