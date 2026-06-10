import React, { useEffect, useState } from "react";
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
  const [sujets, setSujets] = useState([]);

  if (loading) return <div>Chargement...</div>;
  if (!profile) return <Navigate to="/" replace />;

  // Récupération des fichiers accessibles avec informations propriétaire
  const fetchSujets = async () => {
    setMessage("Chargement des fichiers...");
    try {
      // 1. Lister les dossiers racine (IDs des utilisateurs accessibles)
      const { data: folders, error: foldersError } = await supabase.storage
        .from("sujets")
        .list("", { limit: 1000 });

      if (foldersError) throw foldersError;

      // 2. Pour chaque dossier, lister son contenu
      let allFiles = [];

      for (const folder of folders) {
        if (folder.name) {
          const folderPath = `${folder.name}/`;
          const { data: files, error: filesError } = await supabase.storage
            .from("sujets")
            .list(folderPath, { limit: 1000 });
          if (filesError) {
            console.warn(`Erreur pour le dossier ${folderPath}:`, filesError);
            continue;
          }
          const filesWithPath = files.map((file) => ({
            ...file,
            fullPath: `${folderPath}${file.name}`,
            ownerId: folder.name,
          }));
          allFiles = [...allFiles, ...filesWithPath];
        }
      }

      // 3. Récupérer les profils des propriétaires
      const ownerIds = [...new Set(allFiles.map((f) => f.ownerId))];

      let ownerMap = {};

      if (ownerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .in("id", ownerIds);
        if (!profilesError && profiles) {
          ownerMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
        }
      }

      // 4. Ajouter l'objet owner à chaque fichier
      const filesWithOwner = allFiles.map((file) => ({
        ...file,
        owner: ownerMap[file.ownerId] || { full_name: "Inconnu" },
      }));

      setSujets(filesWithOwner);
      setMessage(`${filesWithOwner.length} fichier(s) trouvé(s)`);
    } catch (error) {
      console.error(error);
      setMessage(`Erreur: ${error.message}`);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleAddFile = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage("Aucun fichier sélectionné");
      setError(true);
      return;
    }

    setUploading(true);
    setMessage("Téléversement en cours...");

    const filePath = `${profile.id}/${file.name}`;

    const { data, error: uploadError } = await supabase.storage
      .from("sujets")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(`Erreur: ${uploadError.message}`);
      setMessage(`Erreur: ${uploadError.message}`);
      setUploading(false);
      setError(true);
      return;
    }

    // Succès
    toast.success("Fichier uploadé avec succès");
    setMessage("Fichier uploadé avec succès");
    setUploading(false);
    setFile(null);
    setError(false);

    // Recharger la liste des fichiers
    fetchSujets();
  };

  // Chargement initial
  useEffect(() => {
    if (profile) fetchSujets();
  }, [profile]);

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
          className="flex flex-col gap-2 items-start"
        >
          <label>Ajouter un fichier</label>

          <label
            className={`flex items-center w-full ${
              error ? "border-red-400" : "border-none"
            } bg-blue-500 hover:bg-blue-600 border cursor-pointer rounded-lg mb-4`}
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
              value={file ? file.name : ""}
              disabled={!file}
              className={`border ${
                error ? "border-none text-red-400" : "border-gray-400"
              } bg-white p-1 ml-4 grow rounded-r-lg border-r-0 border-top-0 border-bottom-0`}
              readOnly
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
                setError(false);
              }}
              className="bg-gray-200 text-black py-2 px-4 rounded-md hover:bg-gray-300"
            >
              Effacer
            </button>
          </div>
          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
      </div>

      <div className="mt-4 bg-white rounded shadow p-4">
        <h3 className="text-lg font-bold mb-2">Fichiers disponibles :</h3>
        {sujets.length === 0 ? (
          <p>Aucun fichier trouvé.</p>
        ) : (
          <ul className="divide-y">
            {sujets.map((file) => (
              <li
                key={file.fullPath}
                className="py-2 flex justify-between items-center"
              >
                <div>
                  <a
                    href={
                      supabase.storage
                        .from("sujets")
                        .getPublicUrl(file.fullPath).data.publicUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {file.name}
                  </a>
                  <span className="text-gray-500 text-sm ml-2">
                    (propriétaire: {file.owner?.full_name || "Inconnu"})
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
