import { useAuth } from "../context/AuthContext";
import { useUsers } from "../context/UsersContext";
import { Navigate } from "react-router-dom";
import { supabase } from "../base/supabase";
import { useState } from "react";
import toast from "react-hot-toast";

const Profile = () => {
  const { profile, loading } = useAuth();
  const { allUsers, loading: usersLoading, refreshUsers } = useUsers();
  const [updatingUserId, setUpdatingUserId] = useState(null);

  if (loading) return <div>Chargement...</div>;
  if (!profile) return <Navigate to="/" replace />;

  const handleParentChange = async (userId, newParentId) => {
    setUpdatingUserId(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ parent_id: newParentId || null })
      .eq("id", userId);

    if (error) {
      toast.error("Erreur lors de la mise à jour : " + error.message);
    } else {
      toast.success("Parent mis à jour");
      refreshUsers();
    }
    setUpdatingUserId(null);
  };

  return (
    <div className="space-y-6">
      {/* Profil de l'utilisateur connecté */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Mon Profil</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Nom complet</p>
            <p className="font-medium">{profile?.full_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{profile?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Téléphone</p>
            <p className="font-medium">{profile?.phone || "Non renseigné"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Rôle</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm ${
                profile?.role === "admin"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {profile?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Section Admin - Liste des utilisateurs avec gestion du parent */}
      {profile?.role === "admin" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            Gestion des Utilisateurs
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {allUsers.length} utilisateur{allUsers.length > 1 ? "s" : ""}
            </span>
          </h2>

          {usersLoading ? (
            <div className="text-center py-8">
              Chargement des utilisateurs...
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
                      Date d'inscription
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allUsers.map((user) => {
                    // Liste des parents possibles (tous les autres utilisateurs)
                    const possibleParents = allUsers.filter(
                      (u) => u.id !== user.id,
                    );
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.full_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {updatingUserId === user.id ? (
                            <span className="text-gray-400">
                              Mise à jour...
                            </span>
                          ) : (
                            <select
                              value={user.parent_id || ""}
                              onChange={(e) =>
                                handleParentChange(
                                  user.id,
                                  e.target.value || null,
                                )
                              }
                              className="border rounded px-2 py-1 text-sm w-48"
                            >
                              <option value="">Aucun</option>
                              {possibleParents.map((parent) => (
                                <option key={parent.id} value={parent.id}>
                                  {parent.full_name} ({parent.role})
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString(
                            "fr-FR",
                          )}
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
    </div>
  );
};

export default Profile;
