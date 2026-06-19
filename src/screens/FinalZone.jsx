import React, { useState } from "react";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const FinalZone = () => {
  const { profile } = useAuth();
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [finalSujets, setFinalSujets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  if (!profile) return <Navigate to="/" replace />;

  // ====== VÉRIFICATION SÉCURISÉE VIA BASE DE DONNÉES ======
  const handleUnlock = async (e) => {
    e.preventDefault();
    setUnlocking(true);
    try {
      const { data, error } = await supabase.rpc(
        "verify_final_zone_passwords",
        {
          p1: password1,
          p2: password2,
        },
      );

      if (error) throw error;

      if (data) {
        setIsUnlocked(true);
        toast.success("Accès autorisé - Zone Finale");
        fetchFinalSujets();
      } else {
        toast.error("Mots de passe incorrects");
        setPassword1("");
        setPassword2("");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur de vérification des accès");
    } finally {
      setUnlocking(false);
    }
  };

  const handleLock = (e) => {
    setIsUnlocked(false);
    setPassword1("");
    setPassword2("");
  };

  // ====== RÉCUPÉRATION DES SUJETS FINAUX ======
  const fetchFinalSujets = async () => {
    setLoading(true);
    try {
      // LISTE COMPLÈTE DES 8 MATIÈRES
      const matieres = [
        "maths",
        "francais",
        "pc",
        "philo",
        "histo-geo",
        "anglais",
        "eps",
        "lv2",
      ];

      let allFinal = [];

      // Pour chaque matière, on récupère les sujets avec statut "final"
      for (const mat of matieres) {
        const { data, error } = await supabase
          .from("sujets")
          .select("*")
          .eq("matiere", mat)
          .eq("statut", "final")
          .order("created_at", { ascending: false })
          .limit(3);

        if (error) {
          console.error(`Erreur pour ${mat}:`, error);
        } else if (data?.length) {
          allFinal = [...allFinal, ...data];
        }
      }

      setFinalSujets(allFinal);
    } catch (err) {
      toast.error("Erreur lors du chargement des sujets finaux");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ====== TÉLÉCHARGEMENT ======
  const downloadFile = async (fullPath, name) => {
    const { data, error } = await supabase.storage
      .from("sujets")
      .createSignedUrl(fullPath, 300);
    if (error) return toast.error("Impossible de télécharger");
    window.open(data.signedUrl, "_blank");
  };

  // ====== ÉCRAN VERROUILLÉ ======
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
              disabled={unlocking}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition mt-6 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {unlocking ? (
                <FaSpinner className="animate-spin" />
              ) : (
                "Accéder à la Zone Finale"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Réservé à la haute direction - Impression des sujets officiels
          </p>
        </div>
      </div>
    );
  }

  // ====== ÉCRAN DÉVERROUILLÉ (AFFICHAGE DES SUJETS) ======
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FaFolderOpen className="text-emerald-600" />
              Zone Finale - Sujets Officiels
            </h1>
            <p className="text-gray-600 mt-1">
              3 sujets par matière sélectionnés pour impression
            </p>
          </div>
          <button
            onClick={handleLock}
            className="flex items-center gap-2 text-sm text-gray-600 bg-white hover:bg-gray-100 px-4 py-2 rounded-lg shadow-sm border border-gray-200 transition"
          >
            <FaLock /> Verrouiller la session
          </button>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="text-center py-12">
            <FaSpinner className="animate-spin text-4xl mx-auto text-emerald-500" />
            <p className="text-gray-500 mt-4">
              Chargement des sujets officiels...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {finalSujets.length > 0 ? (
              finalSujets.map((sujet, index) => (
                <div
                  key={sujet.id || index}
                  className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition border border-gray-100"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wide">
                        {sujet.matiere}
                      </span>
                      <p className="font-semibold text-lg text-gray-800 mt-3">
                        Sujet Final #{(index % 3) + 1}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        downloadFile(sujet.original_file_path, sujet.file?.name)
                      }
                      className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white p-3 rounded-full transition cursor-pointer"
                      title="Télécharger le sujet"
                    >
                      <FaDownload size={20} />
                    </button>
                  </div>

                  <div className="border-t border-gray-100 pt-4 mt-2">
                    <p className="text-sm text-gray-500 flex items-center gap-2">
                      Validé le{" "}
                      <span className="font-medium text-gray-700">
                        {sujet.updated_at
                          ? format(
                              new Date(sujet.updated_at),
                              "dd/MM/yyyy 'à' HH:mm",
                              { locale: fr },
                            )
                          : sujet.created_at
                            ? format(
                                new Date(sujet.created_at),
                                "dd/MM/yyyy 'à' HH:mm",
                                { locale: fr },
                              )
                            : "Date inconnue"}
                      </span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-16 text-gray-400 bg-white rounded-2xl shadow-sm">
                <FaFolderOpen className="text-6xl mx-auto mb-4" />
                <p className="text-lg">
                  Aucun sujet final disponible pour le moment
                </p>
                <p className="text-sm mt-2">
                  Veuillez générer les sujets finaux depuis le Dashboard.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalZone;
