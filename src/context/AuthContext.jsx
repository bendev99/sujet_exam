import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../base/supabase";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Écouter les changements d'authentification (gère login ET refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") {
        // Au refresh, charger la session
        if (session?.user) {
          await fetchProfile(session.user);
        } else {
          setLoading(false);
        }
      }

      if (event === "SIGNED_IN" && session?.user) {
        setTimeout(() => {
          fetchProfile(session.user);
        }, 200);
        return;
      } else if (event === "SIGNED_OUT") {
        // Après logout
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (authUser) => {
    try {
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("Erreur profil:", error);
        setLoading(false);
        return;
      }

      setUser(authUser);
      setProfile({ ...profileData, email: authUser.email });
    } catch (error) {
      console.error("Erreur fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
