import React from "react";

export const DotSeparator: React.FC = () => {
  return (
    <div 
      style={{
        width: "4px",
        height: "4px",
        background: "rgba(255, 255, 255, 0.3)",
        borderRadius: "50%",
        margin: "0 10px",
        flexShrink: 0
      }} 
    />
  );
};
