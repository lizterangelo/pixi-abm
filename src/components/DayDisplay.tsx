import { useEffect, useState } from "react";
import {
  getDayCount,
  addStateChangeListener,
} from "../simulation/SimulationControl";

const DayDisplay = () => {
  const [dayCount, setDayCount] = useState(getDayCount());

  useEffect(() => {
    const unsubscribe = addStateChangeListener(() => {
      setDayCount(getDayCount());
    });
    return unsubscribe;
  }, []);

  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        padding: "6px 12px",
        borderRadius: "15px",
        border: "2px solid #FFC107", // Amber color for days
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        fontWeight: "bold",
        color: "#FFA000", // Darker amber for text
        fontSize: "12px",
        whiteSpace: "nowrap",
      }}
    >
      ☀️ Week: {dayCount}
    </div>
  );
};

export default DayDisplay;
