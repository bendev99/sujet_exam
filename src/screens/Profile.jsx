import { useAuth } from "../context/AuthContext";
import { useUsers } from "../context/UsersContext";
import { Navigate } from "react-router-dom";
import { supabase } from "../base/supabase";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  FaUserEdit,
  FaUserTag,
  FaCalendarAlt,
  FaSave,
  FaSpinner,
  FaUsers,
  FaPlus,
  FaTimes,
} from "react-icons/fa";

const Profile = () => {
  const { profile, loading, refreshAuth } = useAuth();
  const { allUsers, loading: usersLoading, refreshUsers } = useUsers();
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "etablissement",
    parent_id: "",
  });
  const [creating, setCreating] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (!profile) return <Navigate to="/" replace />;

  const handleParentChange = async (userId, newParentId) => {
    setUpdatingUserId(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ parent_id: newParentId || null })
      .eq("id", userId);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Parent mis à jour");
      refreshUsers();
    }
    setUpdatingUserId(null);
  };

  // Fonction de création
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);

    // Sauvegarder la session de l'admin
    const {
      data: { session: adminSession },
    } = await supabase.auth.getSession();

    const { error } = await supabase.auth.signUp({
      email: newUser.email,
      password: newUser.password,
      options: {
        data: {
          full_name: newUser.full_name,
          phone: newUser.phone,
          role: newUser.role,
          parent_id: newUser.parent_id || null,
        },
      },
    });

    if (error) {
      toast.error("Erreur : " + error.message);
      setCreating(false);
      return;
    }

    toast.success("Utilisateur créé avec succès");
    setShowCreateModal(false);
    setNewUser({
      email: "",
      password: "",
      full_name: "",
      phone: "",
      role: "etablissement",
      parent_id: "",
    });
    refreshUsers();

    // Restaurer la session admin
    if (adminSession) {
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
      // Recharger le profil dans le contexte
      await refreshAuth();
    }

    setCreating(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center gap-2 ml-2">
          <FaUserEdit className="text-2xl text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-800">Mon profil</h1>
        </div>

        {/* Carte profil */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-linear-to-r from-blue-500 to-blue-800 px-6 py-4">
            <h2 className="text-xl font-semibold text-white">
              Informations personnelles
            </h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-500">Nom complet</label>
              <p className="font-medium text-gray-800">{profile.full_name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="font-medium text-gray-800">{profile.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Téléphone</label>
              <p className="font-medium text-gray-800">
                {profile.phone || "Non renseigné"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-500">
                {profile.role === "admin" ? "Rôle" : "Département"}
              </label>
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm uppercase">
                <FaUserTag /> {profile.role}
              </span>
            </div>
          </div>
        </div>

        {/* Section admin */}
        {profile.role === "admin" && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="bg-linear-to-r from-blue-500 to-blue-800 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FaUsers /> Gestion des utilisateurs
              </h2>
              <div className="flex items-center gap-3">
                <span className="bg-white text-gray-800 text-sm font-bold px-3 py-1 rounded-full">
                  {allUsers.length}
                </span>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-sm"
                >
                  <FaPlus /> Ajouter
                </button>
              </div>
            </div>
            {usersLoading ? (
              <div className="p-12 text-center">
                <FaSpinner className="animate-spin text-gray-400 text-3xl mx-auto" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Nom
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Parent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Inscription
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allUsers.map((user) => {
                      const possibleParents = allUsers.filter(
                        (u) => u.id !== user.id,
                      );
                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {user.full_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {updatingUserId === user.id ? (
                              <FaSpinner className="animate-spin text-blue-500" />
                            ) : (
                              <select
                                value={user.parent_id || ""}
                                onChange={(e) =>
                                  handleParentChange(
                                    user.id,
                                    e.target.value || null,
                                  )
                                }
                                className="border border-gray-300 rounded-md text-sm p-1 bg-white"
                              >
                                <option value="">Aucun</option>
                                {possibleParents.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.full_name} ({p.role})
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <FaCalendarAlt size={12} />
                              {new Date(user.created_at).toLocaleDateString(
                                "fr-FR",
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modale d'ajout d'un nouveau utilisateur */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Ajouter un utilisateur</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                {/* Champs : full_name, email, password, phone, role, parent_id */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nom complet
                  </label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, full_name: e.target.value })
                    }
                    className="w-full ring ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    className="w-full ring ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    className="w-full ring ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) =>
                      setNewUser({ ...newUser, phone: e.target.value })
                    }
                    className="w-full ring ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Département
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="w-full ring ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-2"
                  >
                    <option value="etablissement">Lycée/CEG</option>
                    <option value="cisco">Cisco</option>
                    <option value="dren">DREN</option>
                    <option value="men">DEXAMC</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Parent (ID)
                  </label>
                  <select
                    value={newUser.parent_id}
                    onChange={(e) =>
                      setNewUser({ ...newUser, parent_id: e.target.value })
                    }
                    className="w-full ring ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-3 py-2"
                  >
                    <option value="">Aucun</option>
                    {allUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    {creating ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      "Créer"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <FaSpinner className="animate-spin text-blue-500 text-5xl mx-auto mb-4" />
      <p className="text-gray-500">Chargement du profil...</p>
    </div>
  </div>
);

export default Profile;
