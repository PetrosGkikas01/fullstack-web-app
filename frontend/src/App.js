import {BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import PrivateRoute from "./routes/PrivateRoute";
import AnnouncementDetail from "./pages/AnnouncementDetail";
import UpdateProfile from "./pages/UpdateProfile";
import ProfessorTopics from "./pages/ProfessorTopics";
import CreateTopic from "./pages/CreateTopic";
import EditTopic from "./pages/EditTopic";
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
      <Route path="/update-profile" element={<UpdateProfile />} />
      <Route path="/professor/topics" element={<ProfessorTopics />} />
      <Route path="/professor/topics/:id/edit" element={<EditTopic />} />
      <Route path="/create-topic" element={<CreateTopic />} />
    </Routes>
    </BrowserRouter>
  );
}

export default App;
