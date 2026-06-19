import React from "react";
import { FaDownload, FaEdit, FaCheck } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const SujetRow = ({ sujet, role, downloadFile, onValidate, onCorriger }) => {
  // Formater le statut
  const formatStatut = (statut) => {
    const labels = {
      brouillon: "Brouillon",
      cisco_valide: "Cisco Validé",
      dren_valide: "DREN Validé",
      dexamc_valide: "DEXAMC Validé",
      final: "Final",
      remplace: "Remplacé",
    };
    return labels[statut] || statut;
  };

  const formatMatiere = (matiere) => {
    const labels = {
      maths: "Mathématiques",
      pc: "Physique-Chimie",
      francais: "Français",
      philo: "Philosophie",
      "histo-geo": "Histo-Géo",
      anglais: "Anglais",
      eps: "EPS Ecrit",
      lv2: "LV2",
    };
    return labels[matiere] || matiere;
  };

  const getStatusStyle = (statut) => {
    const styles = {
      brouillon: "bg-yellow-100 text-yellow-700",
      cisco_valide: "bg-blue-100 text-blue-700",
      dren_valide: "bg-purple-100 text-purple-700",
      dexamc_valide: "bg-green-100 text-green-700",
      final: "bg-emerald-100 text-emerald-700",
      remplace: "bg-gray-100 text-gray-500 line-through",
    };
    return styles[statut] || "bg-gray-100 text-gray-700";
  };

  // Déterminer si le bouton "Valider" doit être affiché
  const canValidate = () => {
    if (role === "cisco" && sujet.statut === "brouillon") return true;
    if (role === "dren" && sujet.statut === "cisco_valide") return true;
    if (role === "men" && sujet.statut === "dren_valide") return true;
    return false;
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td
        className="px-6 py-4 font-medium text-gray-800 max-w-xs truncate"
        title={sujet.name}
      >
        {sujet.name}
      </td>
      <td className="px-6 py-4 capitalize text-gray-700">
        {formatMatiere(sujet.matiere)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusStyle(
            sujet.statut,
          )}`}
        >
          {formatStatut(sujet.statut)}
        </span>
      </td>
      <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
        {sujet.owner?.full_name}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
        {formatDistanceToNow(sujet.uploadedAt, { addSuffix: true, locale: fr })}
      </td>
      <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
        {/* Bouton Télécharger */}
        <button
          onClick={() => downloadFile(sujet.fullPath, sujet.name)}
          className="text-blue-600 hover:text-blue-700 cursor-pointer"
          title="Télécharger"
        >
          <FaDownload size={18} />
        </button>

        {/* Bouton Valider (selon le rôle et le statut) */}
        {canValidate() && (
          <button
            onClick={() => onValidate(sujet)}
            className="text-green-600 hover:text-green-700 cursor-pointer"
            title="Valider ce sujet"
          >
            <FaCheck size={18} />
          </button>
        )}

        {/* Bouton Corriger (uniquement pour Cisco sur brouillon) */}
        {canValidate() && sujet.statut === "brouillon" && (
          <button
            onClick={() => onCorriger(sujet)}
            className="text-orange-600 hover:text-orange-700 cursor-pointer"
            title="Corriger/Remplacer"
          >
            <FaEdit size={18} />
          </button>
        )}
      </td>
    </tr>
  );
};

export default SujetRow;
