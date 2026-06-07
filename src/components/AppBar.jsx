import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../base/supabase";
import { BiUserCircle } from "react-icons/bi";

const AppBar = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="fixed top-0 left-54 right-0 h-16 bg-white border-b flex items-center justify-between px-6 z-50">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Bienvenue, {profile?.full_name}</h1>
          {profile?.role === "admin" && (
            <p className="text-sm text-white bg-amber-800 px-5 rounded-full opacity-60">
              {profile?.role}
            </p>
          )}
        </div>
        <p className="text-sm text-gray-500">{profile?.email}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 rounded-full items-center justify-center font-bold text-gray-400">
          <BiUserCircle size={64} />
        </div>
      </div>
    </div>
  );
};

export default AppBar;
