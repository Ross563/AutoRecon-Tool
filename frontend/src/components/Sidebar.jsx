import { useEffect, useState } from "react";
import axios from "axios";

const Sidebar = ({ onSelect, selectedId }) => {
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReconciliations = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/api/reconcile");
        setReconciliations(res.data);
      } catch (err) {
        console.error("Error fetching reconciliations:", err);
        setReconciliations([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReconciliations();
  }, []);

  return (
    <aside className="w-72 bg-gray-200 h-full p-4 overflow-y-auto border-r">
      <h2 className="font-bold text-lg mb-4">Your Reconciliations</h2>
      {loading ? (
        <div className="flex justify-center items-center h-20">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      ) : reconciliations.length === 0 ? (
        <div className="text-gray-500">No reconciliations found.</div>
      ) : (
        <ul className="space-y-2">
          {reconciliations.map((rec) => (
            <li
              key={rec._id}
              className={`cursor-pointer p-2 rounded ${
                selectedId === rec._id
                  ? "bg-blue-500 text-white"
                  : "hover:bg-blue-100"
              }`}
              onClick={() => onSelect(rec)}
            >
              <div className="font-semibold">
                {rec.createdAt
                  ? new Date(rec.createdAt).toLocaleString()
                  : rec._id}
              </div>
              <div className="text-xs text-gray-600 truncate">
                {rec.result?.matches?.length || 0} matches
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};

export default Sidebar;
