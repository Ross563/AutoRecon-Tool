import React, { useState } from "react";
import axios from "axios";
import Sidebar from "../../components/Sidebar";

axios.defaults.withCredentials = true;

export default function Home() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedRec, setSelectedRec] = useState(null);

  const upload = async () => {
    setLoading(true);
    setResult(null);
    setSelectedRec(null);
    try {
      const form = new FormData();
      form.append("fileA", fileA);
      form.append("fileB", fileB);
      const res = await axios.post("/api/reconcile/upload", form);
      setResult(res.data);
    } catch (err) {
      console.error("Error uploading files:", err);
      setResult({ error: "Failed to get result from backend." });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRec = (rec) => {
    setSelectedRec(rec);
    setResult(rec.result);
  };

  return (
    <div className="flex h-full w-full">
      <Sidebar onSelect={handleSelectRec} selectedId={selectedRec?._id} />
      <div className="flex-1 p-4">
        <h1 className="text-xl font-bold">AI Reconciliation Tool</h1>
        <input type="file" onChange={(e) => setFileA(e.target.files[0])} />
        <input type="file" onChange={(e) => setFileB(e.target.files[0])} />
        <button
          onClick={upload}
          className="bg-blue-500 text-white px-4 py-2 mt-2"
          disabled={loading}
        >
          {loading ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            "Upload"
          )}
        </button>
        {loading && (
          <div className="flex flex-col justify-center items-center mt-6">
            <span className="loading loading-spinner loading-lg"></span>
            <span className="mt-4 text-gray-600 text-center">
              Please wait, AI may take 30 ~ 60 seconds to show results.
            </span>
          </div>
        )}
        {result && !loading && (
          <div className="mt-4 bg-gray-100 p-2 rounded max-h-[70vh] overflow-auto w-full">
            <pre className="text-sm whitespace-pre-wrap break-all">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
