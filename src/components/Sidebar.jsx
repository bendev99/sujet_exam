import React, { useState } from "react";
import { BiLogOut, BiLogOutCircle } from "react-icons/bi";
import { LuLogOut } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { supabase } from "../base/supabase";

const Sidebar = () => {
  const [activeLink, setActiveLink] = useState("/dashboard");
  const navigate = useNavigate();

  const navLinks = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Profile", path: "/profile" },
    { name: "Settings", path: "/settings" },
  ];

  const logout = async () => {
    await supabase.auth.signOut().then(() => {
      navigate("/");
    });
  };

  return (
    <div className="flex flex-col h-screen w-54 bg-gray-800 text-white justify-between">
      <div>
        {/* Header */}
        <div className="p-4 border-b border-gray-600">
          <h2 className="text-lg font-bold">My App</h2>
        </div>

        {/* Navigation */}
        <div className="p-4">
          <ul className="space-y-2">
            {navLinks.map((link) => (
              <li key={link.path}>
                <button
                  className={`p-2 rounded w-full text-start ${activeLink === link.path ? "bg-gray-600" : "hover:bg-gray-600"}`}
                  onClick={() => {
                    setActiveLink(link.path);
                    navigate(link.path);
                  }}
                >
                  {link.name}
                </button>
              </li>
            ))}
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
