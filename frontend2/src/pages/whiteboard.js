import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const Whiteboard = () => {
  const [username, setUsername] = useState("");
  const [ws, setWs] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [color, setColor] = useState("black");
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });

  const connectWebSocket = () => {
    if (!username.trim()) {
      alert("Please enter your name before joining!");
      return;
    }

    const socket = new WebSocket("ws://localhost:8050/ws");

    socket.onopen = () => {
      socket.send(JSON.stringify({ name: username }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "init") {
        Object.values(data.shapes).forEach((shape) => drawShape(JSON.parse(shape)));
        setActiveUsers(data.users);
      } else if (data.type === "join" || data.type === "leave") {
        setActiveUsers(data.users);
      } else {
        drawShape(JSON.parse(data.data));
      }
    };

    setWs(socket);
  };

  const drawShape = (shape) => {
    const ctx = ctxRef.current;
    ctx.beginPath();
    ctx.moveTo(shape.x1, shape.y1);
    ctx.lineTo(shape.x2, shape.y2);
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const startDrawing = (e) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      alert("Please connect first!");
      return;
    }
    setDrawing(true);
    lastPos.current = { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const draw = (e) => {
    if (!drawing) return;
    const ctx = ctxRef.current;
    const { offsetX, offsetY } = e.nativeEvent;

    const shape = {
      id: username + "_" + Date.now(),
      x1: lastPos.current.x,
      y1: lastPos.current.y,
      x2: offsetX,
      y2: offsetY,
      color: color,
      name: username,
    };

    drawShape(shape);
    ws.send(JSON.stringify({ id: shape.id, data: JSON.stringify(shape) }));

    lastPos.current = { x: offsetX, y: offsetY };
  };

  const stopDrawing = () => setDrawing(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    ctxRef.current = canvas.getContext("2d");
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray-800 p-6 rounded-2xl shadow-xl w-full max-w-4xl"
      >
        <h2 className="text-white text-3xl font-semibold text-center mb-4">Distributed Whiteboard</h2>
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1 p-2 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={connectWebSocket}
            className="bg-blue-600 hover:bg-blue-500 transition-all p-2 rounded-lg text-white font-semibold"
          >
            Join
          </button>
        </div>
        <div className="flex space-x-2 mb-4">
          {["black", "red", "blue", "green", "white"].map((col) => (
            <button
              key={col}
              className={`w-10 h-10 rounded-full ${col === "white" ? "border border-gray-500" : ""}`}
              style={{ background: col }}
              onClick={() => setColor(col)}
            />
          ))}
        </div>
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="border-2 border-gray-700 rounded-lg cursor-crosshair w-full"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
        />
        <div className="mt-4">
          <h3 className="text-white text-xl font-semibold">Active Users:</h3>
          <ul className="text-gray-400">
            {activeUsers.map((user, index) => (
              <li key={index}>{user}</li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default Whiteboard;
