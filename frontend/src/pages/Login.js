import "./Login.css";
import { useState, useContext } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginStudent } from "../api/Student";
import { loginProfessor } from "../api/Professor";
// import { loginSecretary } from "../api/Secretary"; // Αν φτιάξεις API για γραμματεία
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "", role: "student" });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async ({ email, password, role }) => {
      switch (role) {
        case "student":
          return loginStudent({ email, password });
        case "professor":
          return loginProfessor({ email, password });
        // case "secretary":
        //   return loginSecretary({ email, password });
        default:
          throw new Error("Μη υποστηριζόμενος ρόλος");
      }
    },
    onSuccess: (data) => {
      login(data.token, form.role); // Αποθήκευση στο context & localStorage
      navigate("/dashboard");
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || err.message || "Κάτι πήγε λάθος";
      alert("Σφάλμα: " + msg);
    },
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  return (
    <form
      className="login-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.email || !form.password || !form.role) {
          alert("Συμπλήρωσε όλα τα πεδία");
          return;
        }
        mutation.mutate(form);
      }}
    >
      <div className="login-header">
        <img
          src="/University_of_Patras_(seal).png"
          alt="Λογότυπο Πανεπιστημίου Πατρών"
          className="login-logo"
        />
      </div>

      <input
        type="email"
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
      />
      <input
        type="password"
        name="password"
        placeholder="Κωδικός"
        value={form.password}
        onChange={handleChange}
      />

      <div className="role-selection">
        <label>
          <input
            type="radio"
            name="role"
            value="student"
            checked={form.role === "student"}
            onChange={handleChange}
            disabled={mutation.isLoading}
          />
          Φοιτητής
        </label>
        <label>
          <input
            type="radio"
            name="role"
            value="professor"
            checked={form.role === "professor"}
            onChange={handleChange}
            disabled={mutation.isLoading}
          />
          Καθηγητής
        </label>
        <label>
          <input
            type="radio"
            name="role"
            value="secretary"
            checked={form.role === "secretary"}
            onChange={handleChange}
            disabled={mutation.isLoading}
          />
          Γραμματεία
        </label>
      </div>

      <button type="submit" disabled={mutation.isLoading}>
        {mutation.isLoading ? "Σύνδεση..." : "Σύνδεση"}
      </button>
    </form>
  );
};

export default Login;
