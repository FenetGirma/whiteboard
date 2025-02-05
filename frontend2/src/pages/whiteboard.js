import React, { useState, useEffect, useRef } from "react";

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
      console.log("Received data:", event.data);
      const data = JSON.parse(event.data);
      if (data.type === "init") {
        Object.values(data.shapes).forEach((shape) =>
          drawShape(JSON.parse(shape))
        );
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
    <div style={{ textAlign: "center" }}>
      <h2>Distributed Whiteboard</h2>
      <input
        type="text"
        placeholder="Enter your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button onClick={connectWebSocket}>Join</button>

      <div>
        <button
          style={{ background: "black" }}
          onClick={() => setColor("black")}
        />
        <button style={{ background: "red" }} onClick={() => setColor("red")} />
        <button
          style={{ background: "blue" }}
          onClick={() => setColor("blue")}
        />
        <button
          style={{ background: "green" }}
          onClick={() => setColor("green")}
        />
        <button
          style={{ background: "gray", color: "white" }}
          onClick={() => setColor("white")}
        >
          Eraser
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={500}
        style={{ border: "2px solid black", cursor: "crosshair" }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
      />

      <div>
        <h3>Active Users:</h3>
        <ul>
          {activeUsers.map((user, index) => (
            <li key={index}>{user}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Whiteboard;
