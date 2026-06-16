import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "../base/supabase";
import toast from "react-hot-toast";
import {
  FaUpload,
  FaFilePdf,
  FaTrashAlt,
  FaDownload,
  FaUserCircle,
  FaSpinner,
  FaCheckCircle,
  FaFolderOpen,
} from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const Dashboard = () => {
  const { profile, loading } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [sujets, setSujets] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  if (loading) return <LoadingSpinner />;
  if (!profile) return <Navigate to="/" replace />;

  // Récupération des fichiers
  const fetchSujets = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const { data: folders, error: foldersError } = await supabase.storage
        .from("sujets")
        .list("", { limit: 1000 });
      if (foldersError) throw foldersError;

      let allFiles = [];
      for (const folder of folders) {
        if (folder.name) {
          const folderPath = `${folder.name}/`;
          const { data: files, error: filesError } = await supabase.storage
            .from("sujets")
            .list(folderPath, { limit: 1000 });
          if (filesError) continue;
          const filesWithPath = files.map((f) => ({
            ...f,
            fullPath: `${folderPath}${f.name}`,
            ownerId: folder.name,
            uploadedAt: new Date(f.created_at || Date.now()),
          }));
          allFiles = [...allFiles, ...filesWithPath];
        }
      }

      // Récupérer les noms des propriétaires
      const ownerIds = [...new Set(allFiles.map((f) => f.ownerId))];

      let ownerMap = {};
      if (ownerIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);
        if (profiles)
          ownerMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
      }

      const filesWithOwner = allFiles.map((file) => ({
        ...file,
        owner: ownerMap[file.ownerId] || { full_name: "Inconnu" },
      }));

      setSujets(filesWithOwner);
    } catch (err) {
      toast.error("Erreur de chargement des fichiers");
      console.error(err);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (profile) fetchSujets();
  }, [profile, fetchSujets]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === "application/pdf") {
      setFile(selected);
      setError(false);
    } else {
      toast.error("Seuls les fichiers PDF sont acceptés");
      setFile(null);
      setError(true);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === "application/pdf") {
      setFile(dropped);
      setError(false);
    } else {
      toast.error("Veuillez glisser un fichier PDF");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Sélectionnez un fichier PDF");
      return;
    }

    setUploading(true);
    const filePath = `${profile.id}/${file.name.replace(/\s/g, "_")}`;

    const { error: uploadError } = await supabase.storage
      .from("sujets")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error(`Échec : ${uploadError.message}`);
      setUploading(false);
      return;
    }

    toast.success("Fichier envoyé avec succès");
    setFile(null);
    setUploading(false);
    fetchSujets();
  };

  const downloadFile = async (filePath, fileName) => {
    const { data, error } = await supabase.storage
      .from("sujets")
      .createSignedUrl(filePath, 60);
    if (error) {
      toast.error("Impossible d'accéder au fichier");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <FaFolderOpen className="text-blue-500" /> Tableau de bord
            </h1>
            <p className="text-gray-500 mt-1">
              Gérez vos sujets d’examen et suivez les contributions
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
            <FaUserCircle className="text-gray-400 text-2xl" />
            <span className="font-medium">{profile.full_name}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {profile.role}
            </span>
          </div>
        </div>

        {/* Carte de dépôt / upload */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4 bg-gray-50">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaUpload className="text-blue-500" /> Ajouter un sujet
            </h2>
          </div>
          <form onSubmit={handleUpload} className="p-6">
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : error
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300 hover:border-blue-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <FaFilePdf className="text-4xl text-red-500" />
                <span className="font-medium">
                  {file ? file.name : "Cliquez ou glissez un PDF ici"}
                </span>
                <span className="text-sm text-gray-400">Taille max. 5 Mo</span>
              </label>
            </div>
            <div className="flex justify-end mt-4">
              <button
                type="submit"
                disabled={uploading || !file}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <FaSpinner className="animate-spin" /> Envoi...
                  </>
                ) : (
                  <>
                    <FaUpload /> Publier
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Liste des fichiers */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4 bg-gray-50 flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaFilePdf className="text-red-500" /> Sujets disponibles
            </h2>
            {loadingFiles && (
              <FaSpinner className="animate-spin text-gray-400" />
            )}
          </div>
          <div className="overflow-x-auto">
            {sujets.length === 0 && !loadingFiles ? (
              <div className="text-center py-12 text-gray-400">
                <FaFolderOpen className="text-5xl mx-auto mb-3" />
                <p>Aucun sujet trouvé</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fichier
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Propriétaire
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ajouté
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sujets.map((doc) => (
                    <tr
                      key={doc.fullPath}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-800">
                        {doc.name}
                      </td>

                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600">
                        {doc.owner?.full_name}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDistanceToNow(doc.uploadedAt, {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        <button
                          onClick={() => downloadFile(doc.fullPath, doc.name)}
                          className="text-blue-600 hover:text-blue-800 transition"
                          title="Télécharger"
                        >
                          <FaDownload size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant de chargement
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <FaSpinner className="animate-spin text-blue-500 text-5xl mx-auto mb-4" />
      <p className="text-gray-500">Chargement du profil...</p>
    </div>
  </div>
);

export default Dashboard;
