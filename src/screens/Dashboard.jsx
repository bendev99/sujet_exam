import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "../base/supabase";
import toast from "react-hot-toast";
import {
  FaUpload,
  FaFilePdf,
  FaDownload,
  FaSpinner,
  FaCheckCircle,
  FaFolderOpen,
  FaEdit,
  FaRandom,
  FaStar,
} from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const Dashboard = () => {
  const { profile } = useAuth();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [matiere, setMatiere] = useState("maths");
  const [sujets, setSujets] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionFile, setCorrectionFile] = useState(null);
  const [currentSujet, setCurrentSujet] = useState(null);
  const [uploadingCorrection, setUploadingCorrection] = useState(false);

  if (!profile) return <Navigate to="/" replace />;

  // ==================== FETCH ====================
  const fetchSujets = useCallback(async () => {
    setLoadingFiles(true);
    try {
      // 1. Lister fichiers du bucket
      const { data: folders } = await supabase.storage
        .from("sujets")
        .list("", { limit: 1000 });

      let allFiles = [];
      for (const folder of folders || []) {
        if (folder.name) {
          const folderPath = `${folder.name}/`;
          const { data: files } = await supabase.storage
            .from("sujets")
            .list(folderPath, { limit: 1000 });

          const filesWithPath = (files || []).map((f) => ({
            ...f,
            fullPath: `${folderPath}${f.name}`,
            ownerId: folder.name,
            uploadedAt: new Date(f.created_at || Date.now()),
          }));
          allFiles = [...allFiles, ...filesWithPath];
        }
      }

      // 2. Métadonnées
      const filePaths = allFiles.map((f) => f.fullPath);
      const { data: metadata } = await supabase
        .from("sujets")
        .select("*")
        .in("original_file_path", filePaths.length ? filePaths : ["dummy"]);

      const metadataMap = Object.fromEntries(
        metadata?.map((m) => [m.original_file_path, m]) || [],
      );

      let enriched = allFiles.map((file) => ({
        ...file,
        ...metadataMap[file.fullPath],
        user_id: metadataMap[file.fullPath]?.user_id || null,
        matiere: metadataMap[file.fullPath]?.matiere || "inconnue",
        statut: metadataMap[file.fullPath]?.statut || "brouillon",
      }));

      // ==================== FILTRAGE ====================
      // On exclut les sujets remplacés
      let filtered = enriched.filter((f) => f.statut !== "remplace");

      if (profile.role === "user") {
        // Enseignant : ses propres sujets
        filtered = filtered.filter((f) => f.ownerId === profile.id);
      } else if (["cisco", "dren", "men", "dexamc"].includes(profile.role)) {
        // Rôles hiérarchiques : tous les sujets de leurs descendants
        const descendantIds = await getDescendantIds(profile.id);
        filtered = filtered.filter((f) => descendantIds.includes(f.ownerId));
      }
      // Admin voit tout

      // Propriétaires
      const ownerIds = [...new Set(filtered.map((f) => f.ownerId))].filter(
        Boolean,
      );
      let ownerMap = {};
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ownerIds);
        ownerMap = Object.fromEntries(owners?.map((o) => [o.id, o]) || []);
      }

      setSujets(
        filtered.map((s) => ({
          ...s,
          owner: ownerMap[s.ownerId] || { full_name: "Inconnu" },
        })),
      );
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement des sujets");
    } finally {
      setLoadingFiles(false);
    }
  }, [profile]);

  const getDescendantIds = async (userId) => {
    const { data } = await supabase.rpc("get_descendant_user_ids", {
      start_id: userId,
    });
    return data || [];
  };

  // ==================== CORRECTION ====================
  const handleCorrectionUpload = async (e) => {
    e.preventDefault();
    if (!correctionFile || !currentSujet) return;
    setUploadingCorrection(true);
    const timestamp = Date.now();
    const safeName = correctionFile.name.replace(/\s+/g, "_");
    const filePath = `${currentSujet.ownerId}/corrige_${timestamp}_${safeName}`;

    try {
      // 1. Upload du fichier corrigé
      const { error: uploadError } = await supabase.storage
        .from("sujets")
        .upload(filePath, correctionFile);
      if (uploadError) throw uploadError;

      // 2. Marquer l'ancien comme remplacé
      await supabase
        .from("sujets")
        .update({
          statut: "remplace",
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentSujet.id);

      // 3. Insérer le nouveau sujet corrigé
      await supabase.from("sujets").insert({
        user_id: currentSujet.user_id,
        matiere: currentSujet.matiere,
        statut: "cisco_valide",
        original_file_path: filePath,
        parent_sujet_id: currentSujet.id,
      });

      toast.success("Correction uploadée et validée");
      setShowCorrectionModal(false);
      setCorrectionFile(null);
      setCurrentSujet(null);
      fetchSujets();
    } catch (err) {
      toast.error("Erreur : " + err.message);
    } finally {
      setUploadingCorrection(false);
    }
  };

  // ==================== UPLOAD INITIAL ====================
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !matiere)
      return toast.error("Fichier et matière sont obligatoires");

    setUploading(true);
    const timestamp = Date.now();
    const safeName = file.name.replace(/\s+/g, "_");
    const filePath = `${profile.id}/${timestamp}_${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("sujets")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      await supabase.from("sujets").insert({
        user_id: profile.id,
        matiere,
        statut: "brouillon",
        original_file_path: filePath,
      });

      toast.success("Sujet uploadé avec succès !");
      setFile(null);
      setMatiere("maths");
      fetchSujets();
    } catch (err) {
      toast.error("Erreur upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (fullPath, name) => {
    const { data, error } = await supabase.storage
      .from("sujets")
      .createSignedUrl(fullPath, 180);
    if (error) return toast.error("Impossible de télécharger");
    window.open(data.signedUrl, "_blank");
  };

  const updateStatut = async (sujetId, newStatut, message) => {
    const { error } = await supabase
      .from("sujets")
      .update({ statut: newStatut, updated_at: new Date().toISOString() })
      .eq("id", sujetId);
    if (error) toast.error(error.message);
    else {
      toast.success(message);
      fetchSujets();
    }
  };

  useEffect(() => {
    if (profile) fetchSujets();
  }, [profile, fetchSujets]);

  return (
    <div className="bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FaFolderOpen className="text-blue-600" />
              Tableau de bord
            </h1>
            <p className="text-gray-600 mt-1">Gestion des sujets d’examen</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm">
            <span className="font-medium">{profile.full_name}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
              {profile.role.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Upload Section */}
        {profile.role === "user" || profile.role === "cisco" ? (
          <UploadSection
            file={file}
            setFile={setFile}
            matiere={matiere}
            setMatiere={setMatiere}
            uploading={uploading}
            handleUpload={handleUpload}
            dragActive={dragActive}
            setDragActive={setDragActive}
          />
        ) : null}

        {/* Liste des sujets */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaFilePdf className="text-red-500" /> Sujets disponibles
            </h2>

            {profile.role === "dren" && (
              <div className="px-6 py-3 bg-gray-50 flex justify-end">
                <button
                  onClick={async () => {
                    const { error } = await supabase.rpc("select_15_for_dren", {
                      p_matiere: matiere,
                    });
                    if (error) toast.error("Erreur de tri : " + error.message);
                    else {
                      toast.success("15 sujets sélectionnés pour DREN");
                      fetchSujets();
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <FaRandom /> Trier 15 sujets
                </button>
              </div>
            )}

            {profile.role === "men" && (
              <div className="px-6 py-3 bg-gray-50 flex justify-end gap-4">
                <button
                  onClick={async () => {
                    const { error } = await supabase.rpc(
                      "select_10_for_dexamc",
                      { p_matiere: matiere },
                    );
                    if (error) toast.error("Erreur de tri : " + error.message);
                    else {
                      toast.success("10 sujets sélectionnés pour DEXAMC");
                      fetchSujets();
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <FaRandom /> Trier 10 sujets
                </button>
                <button
                  onClick={async () => {
                    const { error } = await supabase.rpc("select_3_final", {
                      p_matiere: matiere,
                    });
                    if (error)
                      toast.error("Erreur de tri final : " + error.message);
                    else {
                      toast.success("3 sujets finaux générés");
                      fetchSujets();
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2"
                >
                  <FaStar /> Générer 3 finaux
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {sujets.length === 0 ? (
              <div className="flex text-center justify-center items-center py-16 text-gray-400">
                {loadingFiles ? (
                  <FaSpinner className="animate-spin text-8xl" />
                ) : (
                  <div className="text-center py-16 text-gray-400">
                    <FaFolderOpen className="text-6xl mx-auto mb-4" />
                    <p className="text-lg">
                      Aucun sujet disponible pour le moment
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fichier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Matière
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Propriétaire
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ajouté
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sujets.map((sujet) => (
                    <SujetRow
                      key={sujet.fullPath}
                      sujet={sujet}
                      role={profile.role}
                      updateStatut={updateStatut}
                      downloadFile={downloadFile}
                      onCorriger={(sujet) => {
                        setCurrentSujet(sujet);
                        setShowCorrectionModal(true);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {showCorrectionModal && (
          <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Uploader la correction</h3>
              <form onSubmit={handleCorrectionUpload}>
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={(e) => setCorrectionFile(e.target.files[0])}
                  className="w-full border rounded-lg p-2 mb-4"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionModal(false)}
                    className="px-4 py-2 border rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingCorrection || !correctionFile}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    {uploadingCorrection ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      "Uploader la correction"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ====================== COMPOSANTS ======================
const UploadSection = ({
  file,
  setFile,
  matiere,
  setMatiere,
  uploading,
  handleUpload,
  dragActive,
  setDragActive,
}) => {
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (
      droppedFile?.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      setFile(droppedFile);
    } else {
      toast.error("Seuls les fichiers Word.docx sont acceptés");
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <FaUpload className="text-blue-600" /> Déposer un nouveau sujet
      </h2>

      <form onSubmit={handleUpload}>
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-blue-400"
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer block">
            <FaFilePdf className="text-5xl text-red-500 mx-auto mb-3" />
            <p className="font-medium text-gray-700">
              {file
                ? file.name
                : "Glissez votre fichier ici ou cliquez pour sélectionner"}
            </p>
          </label>
        </div>

        <div className="flex gap-4 mt-6 justify-end items-center">
          <div className="flex items-center ring ring-blue-300 p-1 rounded-lg">
            <p className="font-semibold">Matière :</p>
            <select
              value={matiere}
              onChange={(e) => setMatiere(e.target.value)}
              className=" rounded-lg px-0 py-2 focus:outline-none"
            >
              <option value="maths">Mathématiques</option>
              <option value="pc">Physique-Chimie</option>
              <option value="francais">Français</option>
              <option value="philo">Philosophie</option>
              <option value="histo-geo">Histoire-Géographie</option>
              <option value="anglais">Anglais</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            {uploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
            {uploading ? "Publication..." : "Publier le sujet"}
          </button>
        </div>
      </form>
    </div>
  );
};

const SujetRow = ({ sujet, role, updateStatut, downloadFile, onCorriger }) => {
  const getStatusStyle = (statut) => {
    const styles = {
      brouillon: "bg-yellow-100 text-yellow-700",
      cisco_valide: "bg-blue-100 text-blue-700",
      dren_valide: "bg-purple-100 text-purple-700",
      dexamc_valide: "bg-green-100 text-green-700",
      final: "bg-emerald-100 text-emerald-700",
    };
    return styles[statut] || "bg-gray-100 text-gray-700";
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 font-medium text-gray-800">{sujet.name}</td>
      <td className="px-6 py-4 capitalize">{sujet.matiere}</td>
      <td className="px-6 py-4">
        <span
          className={`px-3 py-1 text-xs rounded-full ${getStatusStyle(sujet.statut)}`}
        >
          {sujet.statut.replace(/_/g, " ")}
        </span>
      </td>
      <td className="px-6 py-4 text-gray-600">{sujet.owner?.full_name}</td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {formatDistanceToNow(sujet.uploadedAt, { addSuffix: true, locale: fr })}
      </td>
      <td className="px-6 py-4 text-right space-x-4">
        <button
          onClick={() => downloadFile(sujet.fullPath, sujet.name)}
          className="text-blue-600 hover:text-blue-700"
          title="Télécharger"
        >
          <FaDownload size={18} />
        </button>

        {role === "cisco" && sujet.statut === "brouillon" && (
          <button
            onClick={() => onCorriger(sujet)}
            className="text-blue-600 hover:text-blue-700"
            title="Corriger"
          >
            <FaEdit size={18} />
          </button>
        )}
      </td>
    </tr>
  );
};

const EmptyState = () => (
  <div className="text-center py-16 text-gray-400">
    <FaFolderOpen className="text-6xl mx-auto mb-4" />
    <p className="text-lg">Aucun sujet disponible pour le moment</p>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <FaSpinner className="animate-spin text-blue-600 text-5xl" />
  </div>
);

export default Dashboard;
