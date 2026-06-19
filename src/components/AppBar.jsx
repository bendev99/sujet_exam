import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../base/supabase";
import { BiUserCircle } from "react-icons/bi";

const AppBar = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex fixed top-0 left-54 right-0 h-16 bg-white shadow shadow-blue-100 items-center justify-between px-6 z-50">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold uppercase">{profile?.full_name}</h1>
          {profile?.role === "admin" && (
            <p className="text-sm text-white bg-amber-800 px-5 rounded-full opacity-60">
              {profile?.role}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{profile?.email}</p>
          <p className="text-sm text-gray-600 bg-blue-400/30 px-1 rounded-full">
            {profile?.id}
          </p>
        </div>
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
