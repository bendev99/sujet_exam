import React from "react";
import {
  FaDochub,
  FaFilePdf,
  FaFileWord,
  FaSpinner,
  FaUpload,
} from "react-icons/fa";
import toast from "react-hot-toast";

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
      toast.error("Seuls les fichiers Word (.docx) sont acceptés");
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
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer block">
            <FaFileWord className="text-5xl text-blue-500 mx-auto mb-3" />
            <p className="font-medium text-gray-700">
              {file
                ? file.name
                : "Glissez votre fichier ici ou cliquez pour sélectionner"}
            </p>
          </label>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-6 justify-end items-center">
          <div className="flex items-center ring ring-blue-300 p-1 rounded-lg w-full md:w-auto">
            <p className="font-semibold px-2">Matière :</p>
            <select
              value={matiere}
              onChange={(e) => setMatiere(e.target.value)}
              className="rounded-lg px-2 py-2 focus:outline-none bg-transparent"
            >
              <option value="maths">Mathématiques</option>
              <option value="pc">Physique-Chimie</option>
              <option value="francais">Français</option>
              <option value="philo">Philosophie</option>
              <option value="histo-geo">Histoire-Géographie</option>
              <option value="anglais">Anglais</option>
              <option value="eps">EPS Ecrit</option>
              <option value="lv2">LV2</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition w-full md:w-auto justify-center cursor-pointer"
          >
            {uploading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
            {uploading ? "Déposition..." : "Déposer le sujet"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadSection;
