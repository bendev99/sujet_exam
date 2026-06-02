import React, { useEffect, useState } from "react";
import { supabase } from "../base/supabase";
import { useNavigate } from "react-router-dom";
import { BiUserCircle } from "react-icons/bi";

const AppBar = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const getCurrentUser = async () => {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(profileError);
      return null;
    }

    return {
      ...profile,
      email: user.email,
      auth_id: user.id,
    };
  };

  const logout = async () => {
    await supabase.auth.signOut().then(() => {
      navigate("/");
    });
  };

  useEffect(() => {
    getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      setUserProfile(currentUser);
    });
  }, []);

  return (
    <div className="fixed top-0 left-54 right-0 h-16 bg-white border-b flex items-center justify-between px-6 z-50">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Bienvenu, {user?.full_name}</h1>
          {user?.role === "admin" && (
            <p className="text-sm text-white bg-amber-800 px-5 rounded-full opacity-60">
              {user?.role}
            </p>
          )}
        </div>
        <p className="text-sm text-gray-500">{user?.email}</p>
      </div>
      <div className="flex h-14 w-14 rounded-full items-center justify-center font-bold">
        <BiUserCircle size={64} />
      </div>
    </div>
  );
};

export default AppBar;
