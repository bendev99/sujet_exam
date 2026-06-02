import { useEffect, useState } from "react";
import { supabase } from "../base/supabase";

function Code() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("user");

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("*");
    console.log(data);

    setUsers(data);
  };

  const { data } = supabase.auth.getSession();
  console.log(data);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName || !email || !phone || !password) {
      alert("Veuillez remplir tous les champs.");
      return;
    }
    const { data } = await supabase.auth.signUp({
      email,
      password,
    });

    const user = data.user;

    await supabase
      .from("profiles")
      .insert({
        id: user.id,
        full_name: fullName,
        phone: phone,
        role: role,
      })
      .then(({ data, error }) => {
        fetchUsers();

        setFullName("");
        setEmail("");
        setPhone("");
        setPassword("");
      });
  };

  useEffect(() => {
    fetchUsers();
  }, [users.length]);

  return (
    <div className="body">
      <div className="flex flex-col gap-3 items-center justify-center ">
        <h1 className="text-3xl font-bold mt-16">Inscription</h1>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 max-w-sm w-full bg-white p-6 rounded-lg shadow-md"
        >
          <input
            type="text"
            placeholder="Nom complet"
            className="flex bg-gray-100 p-2 rounded-md border-none ring ring-blue-400 focus:outline-0 focus:ring-2 focus:ring-blue-500"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Adresse email"
            className="flex bg-gray-100 p-2 rounded-md border-none ring ring-blue-400 focus:outline-0 focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="tel"
            placeholder="Numéro de téléphone"
            className="flex bg-gray-100 p-2 rounded-md border-none ring ring-blue-400 focus:outline-0 focus:ring-2 focus:ring-blue-500"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            type="password"
            placeholder="Mot de passe"
            className="flex bg-gray-100 p-2 rounded-md border-none ring ring-blue-400 focus:outline-0 focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <select
            name="role"
            id="role"
            className="flex bg-gray-100 p-2 rounded-md border-none ring ring-blue-400 focus:outline-0 focus:ring-2 focus:ring-blue-500"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="user">Utilisateur</option>
            <option value="admin">Administrateur</option>
          </select>
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
          >
            S'inscrire
          </button>
        </form>
      </div>

      {/* Afficher les utilisateurs */}
      <div className="">
        <h2 className="text-2xl font-bold mt-8 mb-4">Utilisateurs inscrits</h2>
        <ul className="list-disc list-inside">
          {users.map((user) => (
            <li key={user.id}>{user.full_name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Code;
