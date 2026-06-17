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
import UploadSection from "../components/dashboard/UploadSection";
import SujetRow from "../components/dashboard/SujetRow";

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

  // ====== RECUPERATION DE TOUT LES SUJETS DANS LA BASE ======
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

export default Dashboard;
