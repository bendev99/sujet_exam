import { FaCog } from "react-icons/fa";
import React from "react";
import { BiLogOutCircle } from "react-icons/bi";
import { FaHome, FaLock, FaUser } from "react-icons/fa";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { supabase } from "../base/supabase";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const navLinks = [
    { name: "Tableau de bord", path: "/dashboard", icon: <FaHome /> },
    { name: "Profile", path: "/profile", icon: <FaUser /> },
    { name: "Paramètres", path: "/settings", icon: <FaCog /> },
  ];

  const secureLinks = [];
  if (profile?.role === "admin" || profile?.role === "men") {
    secureLinks.push({
      name: "Zone Sécurisée",
      path: "/final",
      icon: <FaLock className="text-red-400" />,
    });
  }

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="flex flex-col h-screen w-54 fixed left-0 bg-linear-to-b from-blue-950 to-blue-800 text-white justify-between">
      <div>
        {/* Header */}
        <div className="p-4 border-b border-gray-600">
          <h2 className="text-lg font-bold">Gestion Sujet</h2>
          {profile && (
            <p className="text-xs text-white mt-1">
              Utilisateur : {profile.full_name}
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="p-4">
          <ul className="space-y-2">
            {/* Liens classiques */}
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    className={`p-2 rounded w-full text-start flex items-center gap-2 ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-gray-100 hover:bg-blue-900"
                    }`}
                  >
                    {link.icon}
                    {link.name}
                  </NavLink>
                </li>
              );
            })}

            {/* Liens sécurisés (Zone Finale) */}
            {secureLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <li
                  key={link.path}
                  className="mt-4 pt-4 border-t border-blue-800"
                >
                  <NavLink
                    to={link.path}
                    className={`p-2 rounded w-full text-start flex items-center gap-2 ${
                      isActive
                        ? "bg-red-600 text-white"
                        : "text-red-300 hover:bg-red-900/50"
                    }`}
                  >
                    {link.icon}
                    {link.name}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="flex p-3 justify-center">
        <button
          onClick={logout}
          className="p-2 rounded bg-red-400 hover:bg-red-500 w-full flex items-center justify-center gap-2 cursor-pointer"
        >
          <p className="text-xl">Deconnexion</p>
          <BiLogOutCircle size={16} className="rotate-180" />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
