import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Whiteboard from "./pages/whiteboard";
import Register from "./pages/register";
import Login from "./pages/login";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/whiteboard" element={<Whiteboard />} />
      </Routes>
    </Router>
  );
}
