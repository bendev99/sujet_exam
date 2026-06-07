import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

const Dashboard = () => {
  const { profile, loading } = useAuth();

  if (loading) return <div>Chargement...</div>;
  if (!profile) return <Navigate to="/" replace />;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>ID: {profile?.id}</p>
      <p>Nom: {profile?.full_name}</p>
      <p>Email: {profile?.email}</p>
      <p>Téléphone: {profile?.phone}</p>
    </div>
  );
};

export default Dashboard;
