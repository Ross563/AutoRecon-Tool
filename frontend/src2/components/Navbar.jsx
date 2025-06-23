import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { UserContext } from "../context/UserContext";

export default function Navbar() {
  const { user } = useContext(UserContext);
  return (
    <nav className="p-4 bg-gray-800 text-white flex justify-between">
      <Link to="/">Reconciliation Tool</Link>
      <div>
        {user ? (
          <span>Welcome, {user.username}</span>
        ) : (
          <>
            <Link to="/login" className="mr-4">
              Login
            </Link>
            <Link to="/signup">Signup</Link>
          </>
        )}
      </div>
    </nav>
  );
}
