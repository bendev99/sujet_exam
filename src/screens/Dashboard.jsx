import { useEffect, useState } from "react";
import { supabase } from "../base/supabase";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const navigate = useNavigate();

  const getUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
    }

    if (!user) {
      navigate("/");
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    return {
      ...profile,
      email: user?.email,
      auth_id: user?.id,
    };
  };

  useEffect(() => {
    getUser().then((currentUser) => {
      setUser(currentUser);
      setProfiles(currentUser);
    });
  }, []);

  return (
    <div>
      Dashboard
      <p>{profiles?.id}</p>
      <p>{profiles?.full_name}</p>
      <p>{profiles?.email}</p>
      <p>{profiles?.phone}</p>
    </div>
  );
};

export default Dashboard;
