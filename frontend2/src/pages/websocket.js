import React, { useEffect, useState } from "react";

// Define the drawShape function
const drawShape = (data) => {
  // Implement the drawing logic here
  console.log("Drawing shape with data:", data);
};

const MyComponent = () => {
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8050");

    ws.onmessage = function (event) {
      const data = JSON.parse(event.data);

      if (Array.isArray(data.shapes)) {
        data.shapes.forEach((shape) => {
          // Process each shape
        });
      } else {
        console.error(
          "Expected data.shapes to be an array, but received:",
          data.shapes
        );
      }
    };

    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.type === "init") {
        Object.entries(data.shapes).forEach(([id, shapeData]) => {
          try {
            const shape = JSON.parse(shapeData);
            message(shape);
          } catch (error) {
            console.error("Error parsing shape data:", error);
          }
        });
        setActiveUsers(data.users);
      } else if (data.type === "join" || data.type === "leave") {
        setActiveUsers(data.users);
      } else {
        drawShape(data);
      }
    };

    ws.onopen = () => {
      console.log("WebSocket connection established.");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, []);

  return <div>My Component</div>;
};

export default MyComponent;
