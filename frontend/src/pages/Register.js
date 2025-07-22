
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { registerStudent } from "../api/Student";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    student_number: "", department: "", etos: ""
  });

  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: registerStudent,
    onSuccess: () => {
      alert("Επιτυχής εγγραφή!");
      navigate("/");
    },
    onError: (err) => alert("Σφάλμα: " + err.response.data.error),
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutation.mutate(form);
    }}>
      <h2>Εγγραφή Φοιτητή</h2>
      {["name", "email", "password", "student_number", "department", "etos"].map((field) => (
        <input
          key={field}
          name={field}
          placeholder={field}
          type={field === "password" ? "password" : "text"}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
        />
      ))}
      <button type="submit">Εγγραφή</button>
    </form>
  );
};

export default Register;
