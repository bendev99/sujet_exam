import React, { useState } from "react";
import { supabase } from "../base/supabase";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!fullName || !email || !password || !phone) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);

    // Envoi des données en métadonnées supabase
    const { data, error } = await supabase.auth
      .signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: role,
          },
        },
      })
      .then(() => {
        navigate("/");
      });

    setLoading(false);

    if (error) {
      toast.error("Erreur lors de l'inscription : " + error.message);
      return;
    }

    // Gestion de la confirmation par email
    if (data.user && !data.user.email_confirmed_at) {
      toast.success(
        "Inscription réussie ! Vérifiez votre boîte mail pour confirmer votre compte.",
      );
    } else {
      toast.success("Compte créé avec succès !");
    }

    setFullName("");
    setEmail("");
    setPassword("");
    setPhone("");
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleRegister}
        className="flex flex-col gap-4 w-96 mx-auto mt-20 bg-white p-8 rounded-lg shadow-md"
      >
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Register
        </h1>

        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="Password (min 6 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="tel"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>
    </div>
  );
};

export default Register;
