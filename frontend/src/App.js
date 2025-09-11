import {BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AnnouncementDetail from "./pages/AnnouncementDetail";
import UpdateProfile from "./pages/UpdateProfile";
import ProfessorTopics from "./pages/ProfessorTopics";
import CreateTopic from "./pages/CreateTopic";
import EditTopic from "./pages/EditTopic";
import NewAssignment from "./pages/NewAssignment";
import InsertData from "./pages/InsertData";
import MyAssignment from "./pages/MyAssignment";
import ManageThesis from "./pages/ManageThesis";
import CommitteeInvitations from "./pages/CommitteeInvitations";
import ProfessorManageTheses from "./pages/ProfessorManageTheses";
import SecretariatTheses from "./pages/SecretariatTheses";
import ManageSecretaryThesis from "./pages/ManageSecretaryThesis";
import ProfessorThesesList from "./pages/ProfessorThesesList";
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
      <Route path="/new-assignment" element={<NewAssignment />} />
      <Route path="/InsertData" element={<InsertData />} />
      <Route path="/MyAssignment" element={<MyAssignment />} />
      <Route path="/ManageThesis" element={<ManageThesis />} />
      <Route path="/committee-invitations" element={<CommitteeInvitations />} />
      <Route path="/manage-theses" element={<ProfessorManageTheses />} />
      <Route path="/secretary/theses" element={<SecretariatTheses />} />
      <Route path="/ManageSecretaryThesis" element={<ManageSecretaryThesis />} />
      <Route path="/professor/theses-list" element={<ProfessorThesesList />} />
    </Routes>
    
    </BrowserRouter>
  );
}

export default App;
