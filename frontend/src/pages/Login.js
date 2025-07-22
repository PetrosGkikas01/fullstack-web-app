import "./Login.css";

import { useState, useContext } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginStudent } from "../api/Student";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: loginStudent,
    onSuccess: (data) => {
      login(data.token, "student");
      navigate("/dashboard");
    },
    onError: (err) => {
      const msg = err?.response?.data?.error || err.message || "Κάτι πήγε λάθος";
      alert("Σφάλμα: " + msg);
    },
  });

  return (
    <form
      className="login-form"
      onSubmit={(e) => {
        e.preventDefault();
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
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />
      <input
        name="password"
        type="password"
        placeholder="Κωδικός"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <button type="submit" disabled={mutation.isLoading}>
        {mutation.isLoading ? "Σύνδεση..." : "Σύνδεση"}
      </button>
    </form>
  );
};

export default Login;
