import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "../base/supabase";
import toast from "react-hot-toast";
import {
  FaUpload,
  FaFileWord,
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
import { FaPrint } from "react-icons/fa";

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

  // État pour le tri final
  const [processingFinal, setProcessingFinal] = useState(false);

  const matieresList = [
    "maths",
    "francais",
    "pc",
    "philo",
    "histo-geo",
    "anglais",
    "eps",
    "lv2",
  ];

  if (!profile) return <Navigate to="/" replace />;

  // ====== RECUPERATION DE TOUS LES SUJETS ======
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

      // 3. FILTRAGE SELON LE RÔLE
      let filtered = enriched.filter((f) => f.statut !== "remplace");

      if (profile.role === "etablissement") {
        // Enseignant : uniquement ses propres sujets
        filtered = filtered.filter((f) => f.ownerId === profile.id);
      } else if (["cisco", "dren", "men"].includes(profile.role)) {
        // Rôles hiérarchiques : sujets de leurs descendants
        const descendantIds = await getDescendantIds(profile.id);
        filtered = filtered.filter((f) => descendantIds.includes(f.ownerId));
      } else if (profile.role === "admin") {
        // Admin : tout voir
      }

      // 4. RÉCUPÉRATION DES PROPRIÉTAIRES via RPC (bypass RLS)
      const ownerIds = [...new Set(filtered.map((f) => f.ownerId))].filter(
        Boolean,
      );
      let ownerMap = {};

      if (ownerIds.length > 0) {
        const { data: owners, error } = await supabase.rpc(
          "get_profiles_by_ids",
          {
            profile_ids: ownerIds,
          },
        );

        if (error) {
          console.error("Erreur récupération propriétaires:", error);
        } else {
          ownerMap = Object.fromEntries(owners?.map((o) => [o.id, o]) || []);
        }
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

  // ====== VALIDATION MANUELLE D'UN SUJET ======
  const handleValidateSujet = async (sujet) => {
    let newStatut = "";
    let message = "";

    // Déterminer le nouveau statut selon le rôle et le statut actuel
    if (profile.role === "cisco" && sujet.statut === "brouillon") {
      newStatut = "cisco_valide";
      message = "Sujet validé par Cisco";
    } else if (profile.role === "dren" && sujet.statut === "cisco_valide") {
      newStatut = "dren_valide";
      message = "Sujet validé par DREN";
    } else if (profile.role === "men" && sujet.statut === "dren_valide") {
      newStatut = "dexamc_valide";
      message = "Sujet validé par DEXAMC";
    } else {
      toast.error("Action non autorisée");
      return;
    }

    const { error } = await supabase
      .from("sujets")
      .update({ statut: newStatut, updated_at: new Date().toISOString() })
      .eq("id", sujet.id);

    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(message);
      fetchSujets();
    }
  };

  // ====== CORRECTION (UPLOAD NOUVEAU FICHIER) ======
  const handleCorrectionUpload = async (e) => {
    e.preventDefault();
    if (!correctionFile || !currentSujet) return;
    setUploadingCorrection(true);
    const timestamp = Date.now();
    const safeName = correctionFile.name.replace(/\s+/g, "_");
    const filePath = `${currentSujet.ownerId}/corrige_${timestamp}_${safeName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("sujets")
        .upload(filePath, correctionFile);
      if (uploadError) throw uploadError;

      // Marquer l'ancien comme remplacé
      await supabase
        .from("sujets")
        .update({
          statut: "remplace",
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentSujet.id);

      // Insérer le nouveau sujet corrigé
      await supabase.from("sujets").insert({
        user_id: currentSujet.user_id,
        matiere: currentSujet.matiere,
        statut: "cisco_valide",
        original_file_path: filePath,
        parent_sujet_id: currentSujet.id,
      });

      toast.success("Correction déposer et validée");
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

  // ====== UPLOAD INITIAL ======
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

      toast.success("Sujet déposer avec succès !");
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

  // ====== GÉNÉRER 3 SUJETS FINAUX ======
  const handleGenererFinaux = async () => {
    setProcessingFinal(true);
    let hasError = false;
    let totalSelected = 0;

    for (const mat of matieresList) {
      const { data, error } = await supabase.rpc("select_3_final", {
        p_matiere: mat,
      });

      if (error) {
        console.error(`Erreur génération finale pour ${mat}:`, error);
        hasError = true;
      } else if (data) {
        totalSelected += data.length || 0;
      }
    }

    setProcessingFinal(false);

    if (hasError) {
      toast.error("Erreur lors de la génération finale");
    } else {
      toast.success(`${totalSelected} sujets finaux générés`);
    }

    await fetchSujets();
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
            <p className="text-gray-600 mt-1">Gestion des sujets d'examen</p>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm">
            <span className="font-medium">{profile.full_name}</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
              {profile.role.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Upload Section (uniquement pour enseignant et cisco) */}
        {(profile.role === "etablissement" || profile.role === "cisco") && (
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
        )}

        {/* Liste des sujets */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaFileWord className="text-blue-500" /> Sujets disponibles
            </h2>

            {/* BOUTON GÉNÉRER 3 FINAUX (uniquement pour MEN) */}
            {profile.role === "men" && (
              <div className="flex justify-end w-full md:w-auto">
                <button
                  onClick={handleGenererFinaux}
                  disabled={processingFinal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {processingFinal ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaPrint />
                  )}
                  Générer les 3 sujets finaux
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
                      downloadFile={downloadFile}
                      onValidate={handleValidateSujet}
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

        {/* Modal de correction */}
        {showCorrectionModal && (
          <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold mb-4">Déposer la correction</h3>
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
                      "Déposer la correction"
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
