import { useRef, useEffect, useState } from "react";
import { Undo, Redo, PenTool, Eraser } from "lucide-react";

export default function Whiteboard() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [color, setColor] = useState("#FFFFFF");
  const [socket, setSocket] = useState(null);
  const [isSocketOpen, setIsSocketOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.7;
    canvas.height = window.innerHeight * 0.7;
    canvas.style.backgroundColor = "#1E1E2E";
    canvas.style.borderRadius = "12px";
    canvas.style.boxShadow = "0 10px 20px rgba(0, 0, 0, 0.4)";
    ctxRef.current = canvas.getContext("2d");
    ctxRef.current.lineCap = "round";
    ctxRef.current.lineWidth = 3;
    ctxRef.current.strokeStyle = color;

    const ws = new WebSocket("ws://localhost:8090");
    ws.onopen = () => setIsSocketOpen(true);
    ws.onmessage = (message) => drawFromServer(JSON.parse(message.data));
    ws.onclose = () => setIsSocketOpen(false);
    setSocket(ws);

    return () => ws.close();
  }, [color]);

  const startDrawing = (e) => {
    setDrawing(true);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e) => {
    if (!drawing) return;
    ctxRef.current.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctxRef.current.stroke();
    if (socket && isSocketOpen) {
      socket.send(JSON.stringify({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, color }));
    }
  };

  const stopDrawing = () => {
    setDrawing(false);
    ctxRef.current.closePath();
    setHistory([...history, canvasRef.current.toDataURL()]);
  };

  const drawFromServer = (data) => {
    ctxRef.current.strokeStyle = data.color;
    ctxRef.current.lineTo(data.x, data.y);
    ctxRef.current.stroke();
  };

  const undo = () => {
    if (!history.length) return;
    setRedoStack([...redoStack, history.pop()]);
    const img = new Image();
    img.src = history[history.length - 1] || "";
    img.onload = () => ctxRef.current.drawImage(img, 0, 0);
  };

  const redo = () => {
    if (!redoStack.length) return;
    setHistory([...history, redoStack.pop()]);
    const img = new Image();
    img.src = history[history.length - 1] || "";
    img.onload = () => ctxRef.current.drawImage(img, 0, 0);
  };

  return (
    <div className="containerwithheader">
      <header className="header">
        <h1>InkSync</h1>
        <div className="profile-circle">U</div>
      </header>
      <div className="container">
        <div className="toolbar">
          <button onClick={undo} className="toolbar-button"><Undo size={24} /></button>
          <button onClick={redo} className="toolbar-button"><Redo size={24} /></button>
          {["#FFFFFF", "#FFD700", "#FF4500", "#00BFFF", "#32CD32"].map((col) => (
            <button key={col} onClick={() => setColor(col)} className="color-button" style={{ backgroundColor: col }}>
              <PenTool size={20} color={col === "#FFFFFF" ? "#000" : "#fff"} />
            </button>
          ))}
          <button onClick={() => setColor("#1E1E2E")} className="toolbar-button">
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
    </div>
  );
}
