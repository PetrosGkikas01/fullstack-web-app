import {BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./routes/PrivateRoute";
import AnnouncementDetail from "./pages/AnnouncementDetail";

function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/announcement/:id" element={<AnnouncementDetail />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          
            <Dashboard />
          
        }
      />
    </Routes>
    </BrowserRouter>
  );
}

export default App;
