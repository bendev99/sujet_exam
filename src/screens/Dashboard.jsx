import { useEffect, useState } from "react";
import { supabase } from "../base/supabase";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      ...profile,
      email: user.email,
      auth_id: user.id,
    };
  };

  useEffect(() => {
    getUser().then((currentUser) => {
      setUser(currentUser);
    });
  }, []);

  return (
    <div>
      Dashboard
      <p>{allProfiles?.email}</p>
    </div>
  );
};

export default Dashboard;
