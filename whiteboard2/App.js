import { useRef, useEffect, useState } from "react";
import { Undo, Redo, PenTool } from "lucide-react";
import { Eraser } from "lucide-react";



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

  function Header() {
    return (
      <header className="header">
        <h1>InkSync</h1>
        <div className="profile-circle">U</div>

      </header>
    );
  }
  

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
       <Header/>

       <div class="container">
    
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

// CSS
const style = document.createElement("style");
style.innerHTML = `
.containerwithheader{
display:flex;
flex-direction:column
}
.header {
  background-color:rgb(11, 15, 23);
  width: 98%;
  text-align: center;
  font-size: 24px;
  font-weight: 400;
  font-family: 'Great Vibes', cursive;
  color:white;
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
   
   
}

.profile-circle {
  width: 48px;
  height: 48px;
  background-color: #2A2E3A; /* Darker shade */
  color: #FFD700; /* Golden for contrast */
  font-size: 20px;
  font-weight: bold;
  font-family: 'Great Vibes', cursive;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.3);
 
}

  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background-color:rgb(11, 15, 23);

  }
  .toolbar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    background: #1F2937;
    padding: 16px;
    border-radius: 12px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3);
  }
  .toolbar-button {
    width: 48px;
    height: 48px;
    background: #374151;
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .color-button {
    width: 48px;
    height: 48px;
    border: 2px solid #FFF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .canvas {
    margin-left: 24px;
    border-radius: 12px;
    box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.4);
  }
`;
document.head.appendChild(style);
