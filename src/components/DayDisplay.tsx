import { useEffect, useState } from "react";
import { getDayCount, addStateChangeListener } from "../simulation/SimulationControl";

const DayDisplay = () => {
  const [dayCount, setDayCount] = useState(getDayCount());

  useEffect(() => {
    const unsubscribe = addStateChangeListener(() => {
      setDayCount(getDayCount());
    });
    return unsubscribe;
  }, []);

  return (
    <div style={{
      position: "absolute",
      top: "130px", // Positioned below the TickDisplay
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      padding: "8px 16px",
      borderRadius: "20px",
      border: "2px solid #FFC107", // Amber color for days
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      zIndex: 1001,
      fontWeight: "bold",
      color: "#FFA000", // Darker amber for text
      fontSize: "12px"
    }}>
      ☀️ Day: {dayCount}
    </div>
  );
};

export default DayDisplay; 