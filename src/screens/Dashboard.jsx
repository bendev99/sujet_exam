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

  // SOLUTION PROBLÈME 1 : États séparés pour chaque bouton
  const [processingDren, setProcessingDren] = useState(false);
  const [processingDexamc, setProcessingDexamc] = useState(false);
  const [processingFinal, setProcessingFinal] = useState(false);

  const matieresList = [
    "maths",
    "francais",
    "pc",
    "philo",
    "histo-geo",
    "anglais",
  ];

  if (!profile) return <Navigate to="/" replace />;

  const fetchSujets = useCallback(async () => {
    setLoadingFiles(true);
    try {
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

      let filtered = enriched.filter((f) => f.statut !== "remplace");

      if (profile.role === "user") {
        filtered = filtered.filter((f) => f.ownerId === profile.id);
      } else if (["cisco", "dren", "men", "dexamc"].includes(profile.role)) {
        const descendantIds = await getDescendantIds(profile.id);
        filtered = filtered.filter((f) => descendantIds.includes(f.ownerId));
      }

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

      await supabase
        .from("sujets")
        .update({
          statut: "remplace",
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentSujet.id);

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

  // Bouton de selection auto pour Dren
  const handleTriDren = async () => {
    setProcessingDren(true);
    let hasError = false;
    let triFiles = 0;

    for (const mat of matieresList) {
      const { data, error } = await supabase.rpc("select_15_for_dren", {
        p_matiere: mat,
      });
      if (error) {
        console.error(`Erreur tri DREN pour ${mat}:`, error);
        hasError = true;
      } else if (data) {
        triFiles += data.length || 0;
      }
    }

    setProcessingDren(false);

    if (hasError) toast.error("Erreur lors du tri de certaines matières");
    else toast.success(`${triFiles} sujets sélectionnés`);
    fetchSujets();
  };

  // Bouton de selection auto pour Dexamc
  const handleTriDexamc = async () => {
    setProcessingDexamc(true);
    let hasError = false;
    let triFiles = 0;

    for (const mat of matieresList) {
      const { data, error } = await supabase.rpc("select_10_for_dexamc", {
        p_matiere: mat,
      });
      if (error) {
        console.error(`Erreur tri DEXAMC pour ${mat}:`, error);
        hasError = true;
      } else if (data) {
        triFiles += data.length || 0;
      }
    }

    setProcessingDexamc(false);

    if (hasError) toast.error("Erreur lors du tri de certaines matières");
    else toast.success(`${triFiles} sujets sélectionnés`);
    fetchSujets();
  };

  // Bouton de selection auto pour les sujets finaux
  const handleGenererFinaux = async () => {
    setProcessingFinal(true);
    let hasError = false;
    let totalSelected = 0;

    for (const mat of matieresList) {
      // Appel de la fonction RPC
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

    // Rafraîchir pour voir les nouveaux statuts
    await fetchSujets();
  };

  useEffect(() => {
    if (profile) {
      fetchSujets();
    }
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
          <div className="px-6 py-4 bg-gray-50 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <FaFileWord className="text-blue-500" /> Sujets disponibles
            </h2>

            {/* BOUTONS DE TRI CORRIGÉS */}
            {profile.role === "dren" && (
              <div className="flex justify-end w-full md:w-auto">
                <button
                  onClick={handleTriDren}
                  disabled={processingDren}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {processingDren ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaRandom />
                  )}
                  Trier 15 sujets (Toutes matières)
                </button>
              </div>
            )}

            {profile.role === "men" && (
              <div className="flex justify-end gap-4 w-full md:w-auto flex-wrap">
                <button
                  onClick={handleTriDexamc}
                  disabled={processingDexamc}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {processingDexamc ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaRandom />
                  )}
                  Trier 10 sujets (Toutes matières)
                </button>
                <button
                  onClick={handleGenererFinaux}
                  disabled={processingFinal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {processingFinal ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaStar />
                  )}
                  Générer 3 finaux (Toutes matières)
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

        {/* Modal de correction */}
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
