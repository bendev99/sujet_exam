import React, { useEffect, useState } from "react";
import { supabase } from "../base/supabase";

const Profile = () => {
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAllProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "user");

    if (error) {
      console.error(error);
      return [];
    }

    return data;
  };

  useEffect(() => {
    const fetchProfiles = async () => {
      const profiles = await getAllProfiles();

      setAllProfiles(profiles);
      setLoading(false);
    };

    fetchProfiles();
  }, []);

  if (loading) {
    return <p>Chargement des utilisateurs...</p>;
  }

  return (
    <div>
      <h2>Liste des utilisateurs</h2>

      {allProfiles.map((profile) => (
        <p key={profile.id}>{profile.full_name}</p>
      ))}
    </div>
  );
};

export default Profile;
