import { FaDownload, FaEdit } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

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

export default SujetRow;
