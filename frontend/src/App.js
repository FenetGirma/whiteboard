import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Whiteboard from "./pages/whiteboard";
import Register from "./pages/register";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/whiteboard" element={<Whiteboard />} />
      </Routes>
    </Router>
  );
}
