import React from "react";
import { BiLogOutCircle } from "react-icons/bi";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { supabase } from "../base/supabase";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation(); // 👈 Récupère la route actuelle
  const { profile } = useAuth();

  const navLinks = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Profile", path: "/profile" },
    { name: "Settings", path: "/settings" },
  ];

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="flex flex-col h-screen w-54 bg-gray-800 text-white justify-between">
      <div>
        {/* Header */}
        <div className="p-4 border-b border-gray-600">
          <h2 className="text-lg font-bold">My App</h2>
          {profile && (
            <p className="text-xs text-gray-400 mt-1">{profile.full_name}</p>
          )}
        </div>

        {/* Navigation */}
        <div className="p-4">
          <ul className="space-y-2">
            {navLinks.map((link) => {
              // 👈 Compare directement avec l'URL actuelle
              const isActive = location.pathname === link.path;

              return (
                <li key={link.path}>
                  <NavLink
                    to={link.path}
                    className={({ isActive }) =>
                      `p-2 rounded w-full text-start block ${
                        isActive
                          ? "bg-gray-600 text-white"
                          : "text-gray-300 hover:bg-gray-700"
                      }`
                    }
                  >
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
          className="p-2 rounded bg-red-400 hover:bg-red-500 w-full flex items-center justify-center gap-2"
        >
          <p className="text-xl">Deconnexion</p>
          <BiLogOutCircle size={16} className="rotate-180" />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
