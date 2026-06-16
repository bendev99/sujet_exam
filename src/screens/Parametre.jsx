import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useUsers } from "../context/UsersContext";
import { supabase } from "../base/supabase";
import toast from "react-hot-toast";
import {
  FaUser,
  FaLock,
  FaBell,
  FaPalette,
  FaSave,
  FaSpinner,
  FaMoon,
  FaSun,
  FaEnvelope,
  FaPhone,
  FaUserTag,
  FaUsers,
  FaUserEdit,
  FaTimes,
} from "react-icons/fa";
import { LuSettings } from "react-icons/lu";

const Parametre = () => {
  const { profile, refreshProfile } = useAuth();
  const { allUsers, loading: usersLoading, refreshUsers } = useUsers();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // État du formulaire profil
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
  });

  // État changement de mot de passe
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Préférences (thème, notifications)
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [notifications, setNotifications] = useState(
    localStorage.getItem("notifications") !== "false",
  );

  const handleProfileChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Profil mis à jour");
      if (refreshProfile) refreshProfile();
      else window.location.reload();
    }
    setLoading(false);
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: passwordData.newPassword,
    });
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Mot de passe modifié");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
    setPasswordLoading(false);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    toast.success(`Thème ${newTheme === "light" ? "clair" : "sombre"} activé`);
  };

  const toggleNotifications = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    localStorage.setItem("notifications", newValue);
    toast.success(`Notifications ${newValue ? "activées" : "désactivées"}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex items-center gap-2">
          <LuSettings className="text-2xl text-blue-500" />
          <h1 className="text-2xl font-bold">Paramètres</h1>
        </div>

        {/* Carte Profil */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-linear-to-r from-blue-500 to-blue-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FaUser /> Informations personnelles
            </h2>
          </div>
          <form onSubmit={updateProfile} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                <div className="relative">
                  <FaUserTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleProfileChange}
                    className="pl-10 w-full ring-1 text-gray-600 ring-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="pl-10 w-full ring-1 ring-gray-200 bg-gray-100 rounded-lg py-2 px-3 cursor-not-allowed text-gray-400"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  L’email ne peut pas être modifié
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <div className="relative">
                  <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleProfileChange}
                    className="pl-10 w-full ring-1 ring-gray-300 text-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
              >
                {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                {loading
                  ? "Enregistrement..."
                  : "Enregistrer les modifications"}
              </button>
            </div>
          </form>
        </div>

        {/* Carte Sécurité */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="bg-linear-to-r from-blue-500 to-blue-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FaLock /> Sécurité
            </h2>
          </div>
          <form onSubmit={updatePassword} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full ring-1 ring-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full ring-1 ring-gray-300 dark:border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50"
              >
                {passwordLoading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaLock />
                )}
                {passwordLoading
                  ? "Modification..."
                  : "Changer le mot de passe"}
              </button>
            </div>
          </form>
        </div>

        {/* Section Admin : Gestion utilisateurs (édition) */}
        {profile?.role === "admin" && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="bg-linear-to-r from-blue-500 to-blue-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FaUsers /> Gestion des utilisateurs
              </h2>
            </div>
            <div className="p-6">
              {usersLoading ? (
                <div className="text-center py-8">
                  <FaSpinner className="animate-spin mx-auto text-gray-400" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Nom
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Téléphone
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Rôle
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Parent
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {allUsers.map((user) => (
                        <UserEditRow
                          key={user.id}
                          user={user}
                          allUsers={allUsers}
                          refreshUsers={refreshUsers}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4">
          Version 1.0.0 – © {new Date().getFullYear()} Gestion des utilisateurs
        </div>
      </div>
    </div>
  );
};

// Composant pour l'édition d'une ligne utilisateur
const UserEditRow = ({ user, allUsers, refreshUsers }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    phone: user.phone || "",
    role: user.role,
    parent_id: user.parent_id || "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        phone: formData.phone || null,
        role: formData.role,
        parent_id: formData.parent_id || null,
      })
      .eq("id", user.id);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Utilisateur mis à jour");
      refreshUsers();
      setIsEditing(false);
    }
    setSaving(false);
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2 whitespace-nowrap text-sm">
        {isEditing ? (
          <input
            type="text"
            name="full_name"
            value={formData.full_name}
            onChange={handleChange}
            className="ring ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-32"
          />
        ) : (
          <span className="font-medium">{user.full_name}</span>
        )}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
        {user.email}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm">
        {isEditing ? (
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="ring ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-32"
          />
        ) : (
          user.phone || "-"
        )}
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        {isEditing ? (
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="ring ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-32"
          >
            <option value="user">Enseignant</option>
            <option value="cisco">Cisco</option>
            <option value="dren">DREN</option>
            <option value="men">DEXAMC</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
            {user.role}
          </span>
        )}
      </td>
      <td className="px-4 py-2 whitespace-nowrap">
        {isEditing ? (
          <select
            name="parent_id"
            value={formData.parent_id}
            onChange={handleChange}
            className="ring ring-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-32"
          >
            <option value="">Aucun</option>
            {allUsers
              .filter((u) => u.id !== user.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.role})
                </option>
              ))}
          </select>
        ) : (
          <span className="text-sm">
            {user.parent_id
              ? allUsers.find((u) => u.id === user.parent_id)?.full_name ||
                "Inconnu"
              : "Aucun"}
          </span>
        )}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-center">
        {isEditing ? (
          <div className="flex justify-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-green-600 hover:text-green-800"
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="text-red-600 hover:text-red-800"
            >
              <FaTimes />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            <FaUserEdit />
          </button>
        )}
      </td>
    </tr>
  );
};

export default Parametre;
