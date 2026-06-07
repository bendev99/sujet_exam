import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "../base/supabase";
import toast from "react-hot-toast";

const Dashboard = () => {
  const { profile, loading } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const [error, setError] = useState(false);

  if (loading) return <div>Chargement...</div>;
  if (!profile) return <Navigate to="/" replace />;

  const handleAddFile = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage("Aucun fichier sélectionné");
      setError(true);
      return;
    }

    setUploading(true);
    setMessage("Téléversement en cours...");

    const filePath = `${profile?.id ?? "public"}/${Date.now()}_${file.name}`;

    const { data, error } = await supabase.storage
      .from("sujets")
      .upload(filePath, file, { upsert: true });

    if (data) {
      toast.success("Fichier uploadé avec succès");
      setMessage("Fichier uploadé avec succès");

      setUploading(false);
      setFile(null);
      setError(false);
    }

    if (error) {
      toast.error(`Erreur: ${error.message}`);
      setMessage(`Erreur: ${error.message}`);

      setUploading(false);
      setError(true);
      return;
    }

    const { data: publicData } = supabase.storage
      .from("sujets")
      .getPublicUrl(filePath);

    const publicUrl = publicData?.publicUrl ?? null;

    setMessage(
      publicUrl
        ? `Fichier uploadé: ${publicUrl}`
        : "Fichier uploadé avec succès",
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 bg-white rounded shadow">
        <h1>Dashboard</h1>
        <p>ID: {profile?.id}</p>
        <p>Nom: {profile?.full_name}</p>
        <p>Email: {profile?.email}</p>
        <p>Téléphone: {profile?.phone}</p>
      </div>

      <div className="p-4 bg-white rounded shadow">
        <form
          onSubmit={handleAddFile}
          className="flex flex-col gap-2 items-start "
        >
          <label>Ajouter un fichier</label>

          <label
            className={`flex items-center w-full ${
              error ? "border-red-400" : "border-none"
            } bg-blue-500 hover:bg-blue-600  border cursor-pointer rounded-lg mb-4`}
          >
            <span className={`pl-4 ${error ? "text-red-500" : "text-white"}`}>
              {file
                ? "Fichier sélectionné:"
                : "Cliquez pour sélectionner un fichier"}
            </span>
            <input
              type="file"
              hidden
              onChange={(e) => setFile(e.target.files[0] ?? null)}
            />
            <input
              type="text"
              placeholder={file ? file.name : "Télécharger un fichier..."}
              value={file ? file?.name : ""}
              disabled={!file}
              className={`border ${
                error ? "border-none text-red-400" : "border-gray-400"
              } bg-white p-1 ml-4 grow rounded-r-lg border-r-0 border-top-0 border-bottom-0`}
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={uploading}
              className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {uploading ? "Téléversement..." : "Ajouter un fichier"}
            </button>

            <button
              type="button"
              onClick={() => {
                setFile(null);
                setMessage("");
              }}
              className="bg-gray-200 text-black py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Effacer
            </button>
          </div>
          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
