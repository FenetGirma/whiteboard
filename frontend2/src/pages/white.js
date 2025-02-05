import { useRef, useEffect, useState } from "react";
import { Undo, Redo, PenTool, Eraser } from "lucide-react";

export default function Whiteboard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [color, setColor] = useState("black");
  const [socket, setSocket] = useState(null);
  const [isSocketOpen, setIsSocketOpen] = useState(false);
  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const [status, setStatus] = useState("Enter your name to connect...");
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
    canvas.style.backgroundColor = "#1E1E2E";
    canvas.style.borderRadius = "12px";
    canvas.style.boxShadow = "0 10px 20px rgba(0, 0, 0, 0.4)";
    ctxRef.current = canvas.getContext("2d");
    ctxRef.current.lineCap = "round";
    ctxRef.current.lineWidth = 3;
    ctxRef.current.strokeStyle = color;

    const ws = new WebSocket("ws://localhost:8050/ws");
    ws.onopen = () => {
      setIsSocketOpen(true);
      if (username) ws.send(JSON.stringify({ name: username }));
    };
    ws.onmessage = (message) => handleServerMessage(JSON.parse(message.data));
    ws.onclose = () => setIsSocketOpen(false);
    setSocket(ws);

    return () => ws.close();
  }, [color, username]);

  const handleServerMessage = (data) => {
    if (data.type === "init") {
      Object.entries(data.shapes).forEach(([id, shapeData]) => {
        try {
          const shape = JSON.parse(shapeData);
          drawShape(shape);
        } catch (error) {
          console.error("Error parsing shape data:", error);
        }
      });

      setActiveUsers(data.users);
    } else if (data.type === "join" || data.type === "leave") {
      setActiveUsers(data.users);
    } else if (data.type === "clear") {
      clearCanvas(); // Clear canvas if a "clear" message is received
    } else {
      drawShape(data);
    }
  };

  const drawShape = (shape) => {
    ctxRef.current.strokeStyle = shape.color;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(shape.x1, shape.y1);
    ctxRef.current.lineTo(shape.x2, shape.y2);
    ctxRef.current.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]); // Clear the drawing history
    setRedoStack([]); // Clear the redo stack
  };

  const startDrawing = (e) => {
    setDrawing(true);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e) => {
    if (!drawing) return;
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    if (socket && isSocketOpen) {
      socket.send(
        JSON.stringify({
          x1: e.nativeEvent.offsetX,
          y1: e.nativeEvent.offsetY,
          x2: x,
          y2: y,
          color,
        })
      );
    }
  };

  const stopDrawing = () => {
    setDrawing(false);
    ctxRef.current.closePath();
    setHistory([...history, canvasRef.current.toDataURL()]);
  };

  const undo = () => {
    if (!history.length) return;
    const img = new Image();
    img.src = history.pop();
    img.onload = () => ctxRef.current.drawImage(img, 0, 0);
    setRedoStack([...redoStack, img.src]);
  };

  const redo = () => {
    if (!redoStack.length) return;
    const img = new Image();
    img.src = redoStack.pop();
    img.onload = () => ctxRef.current.drawImage(img, 0, 0);
    setHistory([...history, img.src]);
  };

  const connectWebSocket = () => {
    if (!username) {
      alert("Please enter your name before joining!");
      return;
    }
    if (socket && isSocketOpen) {
      socket.send(JSON.stringify({ name: username }));
      setStatus("Connected to WebSocket ✅");
      clearCanvas(); // Clear the canvas when the user logs in
      if (socket && isSocketOpen) {
        socket.send(JSON.stringify({ type: "clear" })); // Notify server to clear canvas for all users
      }
    }
  };

  return (
    <div className="containerwithheader">
      <header className="header">
        <h1>Distributed Whiteboard</h1>
        <div className="profile-circle">{username}</div>
      </header>
      <div className="container">
        <label htmlFor="username">Enter your name: </label>
        <input
          type="text"
          id="username"
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button onClick={connectWebSocket}>Join</button>
        <p id="status">{status}</p>
        <div className="whiteboard-container">
          <div className="toolbar">
            <button onClick={undo} className="toolbar-button">
              <Undo size={24} />
            </button>
            <button onClick={redo} className="toolbar-button">
              <Redo size={24} />
            </button>
            {["black", "red", "blue", "green", "white"].map((col) => (
              <button
                key={col}
                onClick={() => setColor(col)}
                className="color-button"
                style={{ backgroundColor: col }}
              >
                <PenTool size={20} color={col === "white" ? "#000" : "#fff"} />
              </button>
            ))}
            <button
              onClick={() => setColor("white")}
              className="toolbar-button"
            >
              <Eraser size={24} />
            </button>
          </div>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            className="canvas"
          />
        </div>
        <div id="activeUsers">
          <h3>Active Users:</h3>
          <ul>
            {activeUsers.map((user, index) => (
              <li key={index}>
                <div className="user-profile">
                  <div className="profile-circle"></div>
                  <span>{user}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
