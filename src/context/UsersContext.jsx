import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../base/supabase";
import { useAuth } from "./AuthContext";

const UsersContext = createContext({});

export const UsersProvider = ({ children }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  useEffect(() => {
    if (profile?.role === "admin") {
      fetchAllUsers();
    }
  }, [profile]);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    await fetchAllUsers();
  };

  return (
    <UsersContext.Provider value={{ allUsers, loading, refreshUsers }}>
      {children}
    </UsersContext.Provider>
  );
};

export const useUsers = () => useContext(UsersContext);
