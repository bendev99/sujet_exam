import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "../base/supabase";
import toast from "react-hot-toast";
import {
  FaFilePdf,
  FaDownload,
  FaLock,
  FaFolderOpen,
  FaSpinner,
} from "react-icons/fa";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

const FinalZone = () => {
  const { profile } = useAuth();
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [finalSujets, setFinalSujets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mots de passe double propriétaire (à changer en production !)
  const MASTER_PASS_1 = "pass01";
  const MASTER_PASS_2 = "pass02";

  if (!profile) return <Navigate to="/" replace />;

  // Vérification double mot de passe
  const handleUnlock = (e) => {
    e.preventDefault();
    if (password1 === MASTER_PASS_1 && password2 === MASTER_PASS_2) {
      setIsUnlocked(true);
      toast.success("Accès autorisé - Zone Finale");
      fetchFinalSujets();
    } else {
      toast.error("Mots de passe incorrects");
      setPassword1("");
      setPassword2("");
    }
  };

  const fetchFinalSujets = async () => {
    setLoading(true);
    try {
      const matieres = [
        "maths",
        "francais",
        "pc",
        "philo",
        "histo-geo",
        "anglais",
      ];

      let allFinal = [];

      for (const mat of matieres) {
        const { data, error } = await supabase.rpc("select_3_final", {
          p_matiere: mat,
        });
        if (error) {
          console.error(`Erreur pour ${mat}:`, error);
        } else if (data?.length) {
          allFinal = [...allFinal, ...data];
        }
      }

      // Récupérer les fichiers réels
      const filePaths = allFinal.map((s) => s.original_file_path);
      const { data: filesData } = await supabase
        .from("sujets")
        .select("*")
        .in("original_file_path", filePaths);

      const finalWithFiles = allFinal.map((sujet) => ({
        ...sujet,
        file: filesData?.find(
          (f) => f.original_file_path === sujet.original_file_path,
        ),
      }));

      setFinalSujets(finalWithFiles);
    } catch (err) {
      toast.error("Erreur lors du chargement des sujets finaux");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (fullPath, name) => {
    const { data, error } = await supabase.storage
      .from("sujets")
      .createSignedUrl(fullPath, 300);

    if (error) return toast.error("Impossible de télécharger");
    window.open(data.signedUrl, "_blank");
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8">
          <div className="text-center mb-8">
            <FaLock className="text-5xl text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800">
              Zone Finale Sécurisée
            </h1>
            <p className="text-gray-500 mt-2">
              Accès double authentification requis
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe 1 (Propriétaire 1)
              </label>
              <input
                type="password"
                value={password1}
                onChange={(e) => setPassword1(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Mot de passe propriétaire 1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe 2 (Propriétaire 2)
              </label>
              <input
                type="password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Mot de passe propriétaire 2"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition mt-6"
            >
              Accéder à la Zone Finale
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Réservé à la haute direction - Impression des sujets officiels
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FaFolderOpen className="text-emerald-600" />
              Zone Finale - Sujets Officiels
            </h1>
            <p className="text-gray-600">
              3 sujets par matière sélectionnés pour impression
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Verrouiller la session
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <FaSpinner className="animate-spin text-4xl mx-auto text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {finalSujets.length > 0 ? (
              finalSujets.map((sujet, index) => (
                <div key={index} className="bg-white rounded-2xl shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                        {sujet.matiere.toUpperCase()}
                      </span>
                      <p className="font-medium mt-2">
                        Sujet Final #{(index % 3) + 1}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        downloadFile(sujet.original_file_path, sujet.file?.name)
                      }
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <FaDownload size={22} />
                    </button>
                  </div>

                  <p className="text-sm text-gray-500">
                    Validé le{" "}
                    {sujet.updated_at
                      ? format(
                          new Date(sujet.updated_at),
                          "dd/MM/yyyy à HH:mm",
                          { locale: fr },
                        )
                      : sujet.created_at
                        ? format(
                            new Date(sujet.created_at),
                            "dd/MM/yyyy à HH:mm",
                            { locale: fr },
                          )
                        : "Date inconnue"}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-16 text-gray-400">
                <FaFolderOpen className="text-6xl mx-auto mb-4" />
                <p>Aucun sujet final disponible pour le moment</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalZone;
