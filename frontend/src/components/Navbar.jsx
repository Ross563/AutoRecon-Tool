import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import useLogout from "../hooks/useLogout";

const Navbar = () => {
  const { authUser } = useAuthContext();
  const { logout, loading } = useLogout();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="w-full flex justify-between items-center px-6 py-3 bg-gray-800 text-white">
      <Link to="/" className="font-bold text-lg">
        AutoRecon
      </Link>
      <div className="flex gap-4 items-center">
        {!authUser ? (
          <>
            <Link to="/login" className="btn btn-sm btn-outline">
              Login
            </Link>
            <Link to="/signup" className="btn btn-sm btn-outline">
              Signup
            </Link>
          </>
        ) : (
          <>
            <span className="mr-2 flex items-center gap-2">
              {authUser.profilePic && (
                <img
                  src={authUser.profilePic}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-gray-300"
                />
              )}
              Hi, {authUser.fullName || authUser.email}
            </span>
            <button
              className="btn btn-sm btn-error"
              onClick={handleLogout}
              disabled={loading}
            >
              {loading ? "Logging out..." : "Logout"}
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
