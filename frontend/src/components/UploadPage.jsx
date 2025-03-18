import React, { useState, useRef } from "react";
import axios from "axios";
import { IoDocumentTextOutline } from "react-icons/io5";
import { MdArrowBack } from "react-icons/md";
export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [fileThumbnails, setFileThumbnails] = useState([]);
  const [clusters, setClusters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [elbowGraph, setElbowGraph] = useState("");
  const [silhouetteGraph, setSilhouetteGraph] = useState("");
  const [modalFile, setModalFile] = useState(null); // State for managing modal content
  const [showResults, setShowResults] = useState(true); // State to toggle between modal and results page
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setError(null);

    const thumbnails = selectedFiles.map(file => {
      if (file.type.startsWith("image/")) {
        return URL.createObjectURL(file); 
      } else {
        return null; 
      }
    });
    setFileThumbnails(thumbnails);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Please select at least one file.");
      return;
    }

    setLoading(true);
    setError(null);
    const formData = new FormData();
    for (let file of files) {
      formData.append("files", file);
    }

    try {
      const uploadRes = await axios.post("http://127.0.0.1:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const filePaths = uploadRes.data.file_paths;
      const processRes = await axios.post("http://127.0.0.1:5000/process", { file_paths: filePaths });

      setClusters(processRes.data.clusters);
      setElbowGraph(`http://127.0.0.1:5000${processRes.data.elbow_graph}`);
      setSilhouetteGraph(`http://127.0.0.1:5000${processRes.data.silhouette_graph}`);
    } catch (err) {
      setError("Error uploading or processing files. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const capitalizeFirstLetter = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Open file in modal (instead of a new tab)
  const openFile = (fileName) => {
    const fileUrl = `http://127.0.0.1:5000/files/${fileName}`; // Correct file URL
    setModalFile(fileUrl); // Set the file URL to modal
    setShowResults(false); // Hide results page when modal is open
  };

  const closeModal = () => {
    setModalFile(null); // Close the modal
    setShowResults(true); // Show the results page again
  };

  return (
    <div className="flex p-6">
      <div className="flex-1 bg-gray-100 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Upload Files for Clustering</h2>

        {/* Clickable Upload Area */}
        <label
          className="border-dashed border-2 border-gray-400 p-6 rounded-md w-full flex items-center justify-center text-gray-600 cursor-pointer hover:bg-gray-200 transition-all"
          onClick={() => fileInputRef.current.click()}
        >
          {files.length === 0 ? (
            "Click to select files"
          ) : (
            <div className="flex flex-wrap gap-2">
              {fileThumbnails.map((thumb, index) => (
                thumb ? (
                  <img key={index} src={thumb} alt={`thumb-${index}`} className="w-16 h-16 object-cover rounded-md" />
                ) : (
                  <div key={index} className="w-16 h-16 bg-gray-300 text-center flex items-center justify-center rounded-md text-xs">
                    {files[index].name}
                  </div>
                )
              ))}
            </div>
          )}
        </label>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={handleUpload}
          className="bg-blue-600 text-white px-6 py-2 rounded-md mt-4 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
        <button
          onClick={handleRefresh}
          className="bg-gray-600 text-white px-6 py-2 rounded-md ml-4"
        >
          Refresh
        </button>

        {error && <p className="text-red-500 mt-3">{error}</p>}

        {/* Display Clustering Results */}
        {showResults && clusters && (
          <div className="mt-4 p-4 bg-white rounded-md shadow-md">
            <h2 className="text-2xl font-bold">Clustering Results</h2>
            <div className="mt-2 space-y-4">
              {Object.entries(clusters).map(([clusterName, files], index) => (
                <div key={index}>
                  <h3 className="text-xl font-semibold">{capitalizeFirstLetter(clusterName)}</h3>
                  <ul className="list-disc pl-6">
                    {files.map((file, fileIndex) => (
                      <li key={fileIndex} className="text-gray-600 flex items-center">
                        <IoDocumentTextOutline className="mr-2 text-gray-500" />
                        <button
                          onClick={() => openFile(file)} 
                          className="text-gray-700 hover:text-gray-900 cursor-pointer hover:underline"
                        >
                          {file}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clustering Graphs */}
      <div className="flex-1 pl-8">
        <h2 className="text-2xl font-semibold mb-4">Clustering Graphs</h2>
        <div className="flex flex-col gap-6">
          {elbowGraph && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold">Elbow Method</h3>
              <img
                src={elbowGraph}
                alt="Elbow Method Graph"
                className="w-110 h-110 object-contain rounded-md"
              />
            </div>
          )}
          {silhouetteGraph && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold">Silhouette Method</h3>
              <img
                src={silhouetteGraph}
                alt="Silhouette Method Graph"
                className="w-110 h-110 object-contain rounded-md"
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal for displaying file content */}
      {modalFile && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg w-3/4 max-w-3xl">
          <MdArrowBack />
            <button
              onClick={closeModal}
              className="absolute top-4 left-4 border-2 p-2 w-20 bg-blue-500 rounded-lg font-bold text-white-500 hover:text-white cursor-pointer"
            >
              <MdArrowBack />
              Back
            </button>
            <iframe src={modalFile} className="w-full h-96 border-0" title="File Content"></iframe>
          </div>
        </div>
      )}
    </div>
  );
}
