import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchAnnouncement } from "../api/Announcement";
import "./Dashboard.css";

const Dashboard = () => {
  const { auth, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen(!menuOpen);

  const { data: announcement, isLoading, error } = useQuery({
    queryKey: ["announcement", auth.token],
    queryFn: () => fetchAnnouncement(auth.token),
  });

  return (
    <div className="dashboard-container">
      {auth.token && (
        <button className="menu-toggle-btn" onClick={toggleMenu}>
          ☰ Μενού
        </button>
      )}

      
      {auth.token && (
        <div className={`sidebar ${menuOpen ? "open" : ""}`}>
          <button className="close-btn" onClick={toggleMenu}>✕</button>
          <h3>Μενού Χρήστη</h3>
          <ul className="menu-list">
            {auth.role === "student" && (
              <>
                <li onClick={() => {navigate("/MyAssignment"); setMenuOpen(false);}}>Προβολή θέματος</li>
                <li onClick={() => {navigate("/update-profile"); setMenuOpen(false);}}>Επεξεργασία Προφίλ</li>
                <li onClick={() => {navigate("/ManageThesis"); setMenuOpen(false);}}>Διαχείριση διπλωματικής εργασίας</li>
              </>
            )}
            {auth.role === "professor" && (
              <>
                <li onClick={() => {navigate("/professor/topics"); setMenuOpen(false);}}>
                  Προβολή & Διαχείριση Θεμάτων
                </li>
                <li onClick={() => {navigate("/new-assignment"); setMenuOpen(false);}}>
                  Ανάθεση Θέματος σε Φοιτητή
                </li>
                <li onClick={() => {navigate("/professor/theses-list"); setMenuOpen(false);}}>
                  Προβολή Λίστας Διπλωματκών
                </li>
                <li onClick={() => {navigate("/committee-invitations"); setMenuOpen(false);}}>
                  Προσκλήσεις σε Τριμελή Επιτροπή
                </li>
                <li onClick={() => {navigate("/statistics"); setMenuOpen(false);}}>
                  Προβολή Στατιστικών
                </li>
                <li onClick={() => {navigate("/manage-theses"); setMenuOpen(false);}}>
                  Διαχείριση Διπλωματικών Εργασιών
                </li>

              </>
            )}
            {auth.role === "secretary" && (
              <>
                <li onClick={() => {navigate("/secretary/theses"); setMenuOpen(false);}}>Προβολή ΔΕ</li>
                <li onClick={() => {navigate("/InsertData"); setMenuOpen(false);}}>Εισαγωγή δεδομένων</li>
                <li onClick={() => {navigate("/ManageSecretaryThesis"); setMenuOpen(false);}}>Διαχείριση διπλωματικής εργασίας</li>
              </>
            )}
          </ul>
        </div>
      )}

      <img
        src="/dashboard_logo.png"
        alt="Λογότυπο Πανεπιστημίου Πατρών"
        className="dashboard-logo"
      />
      <h2>Σύστημα Υποστήριξης Διπλωματικών Εργασιών</h2>

      {auth.token ? (
        <>
          <h2 className="Welcome_mess">Καλώς ήρθες, {auth.role}</h2>
          <button className="dashboard-btn" onClick={logout}>
            Αποσύνδεση
          </button>
        </>
      ) : (
        <button className="dashboard-btn" onClick={() => navigate("/login")}>
          Σύνδεση
        </button>
      )}

      <div className="announcement-section">
        <h3>Πίνακας Ανακοινώσεων</h3>
        {isLoading && <p>Φόρτωση ανακοινώσεων...</p>}
        {error && <p>Σφάλμα φόρτωσης ανακοινώσεων.</p>}
        {!isLoading && announcement?.length === 0 && (
          <p>Δεν υπάρχουν ανακοινώσεις.</p>
        )}
        <ul className="announcement-list">
          {announcement?.map((a) => (
            <li
              key={a.id}
              className="announcement-item"
              onClick={() => navigate(`/announcement/${a.id}`)}
            >
              <h4>{a.title}</h4>
              <p>{new Date(a.created_at).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
