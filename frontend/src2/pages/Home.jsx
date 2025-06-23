import React, { useState } from "react";
import axios from "axios";

axios.defaults.withCredentials = true;

export default function Home() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [result, setResult] = useState(null);

  const upload = async () => {
    const form = new FormData();
    form.append("fileA", fileA);
    form.append("fileB", fileB);
    const res = await axios.post(
      "http://localhost:5000/api/reconcile/upload",
      form
    );
    setResult(res.data);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">AI Reconciliation Tool</h1>
      <input type="file" onChange={(e) => setFileA(e.target.files[0])} />
      <input type="file" onChange={(e) => setFileB(e.target.files[0])} />
      <button
        onClick={upload}
        className="bg-blue-500 text-white px-4 py-2 mt-2"
      >
        Upload
      </button>
      {result && (
        <pre className="mt-4 bg-gray-100 p-2 overflow-auto text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
