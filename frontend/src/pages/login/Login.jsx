import { useState } from "react";
import { Link } from "react-router-dom";
import useLogin from "../../hooks/useLogin";
import { BiCopy } from "react-icons/bi";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const { loading, login } = useLogin();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  function handleCopy() {
    const email = "2222@2222.2222";
    navigator.clipboard
      .writeText(email)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => alert("Failed to copy"));
  }

  return (
    <div className="flex flex-col items-center justify-center min-w-96 mx-auto">
      <div className="w-full p-6 rounded-lg shadow-md bg-gray-400 bg-clip-padding backdrop-filter backdrop-blur-lg bg-opacity-0">
        <h1 className="text-3xl font-semibold text-center text-gray-300">
          Login
          <span className="text-blue-500"> ChatApp</span>
        </h1>

        <form onSubmit={handleSubmit}>
          <div>
            <label className="label p-2">
              <span className="text-base label-text">Email</span>
            </label>
            <input
              type="email"
              placeholder="Enter email"
              className="w-full input input-bordered h-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="label">
              <span className="text-base label-text">Password</span>
            </label>
            <input
              type="password"
              placeholder="Enter Password"
              className="w-full input input-bordered h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Link
            to="/signup"
            className="text-sm  hover:underline hover:text-blue-600 mt-2 inline-block"
          >
            {"Don't"} have an account?
          </Link>

          <div>
            <button className="btn btn-block btn-sm mt-2" disabled={loading}>
              {loading ? (
                <span className="loading loading-spinner "></span>
              ) : (
                "Login"
              )}
            </button>
          </div>
          {/* <div className="mt-5">
            test email : 2222@2222.2222,
            <br /> test password: 2222@2222.2222
          </div> */}
          <div className="mt-8 flex items-center gap-2">
            <h3>(TEST email == password) = 2222@2222.2222</h3>
            <BiCopy
              onClick={handleCopy}
              className="text-xl cursor-pointer text-gray-600 hover:text-blue-500"
            >
              📋 Copy
            </BiCopy>
          </div>
          {copied && <p className="text-blue-500">Copied to clipboard!</p>}
        </form>
      </div>
    </div>
  );
};
export default Login;

// import { useState } from "react";
// import { Link } from "react-router-dom";
// import useLogin from "../../hooks/useLogin";

// const Login = () => {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const { loading, login } = useLogin();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await login(email, password);
//     } catch (error) {
//       console.error("Login error:", error);
//     }
//   };

//   return (
//     <div className="flex flex-col items-center justify-center min-w-96 mx-auto">
//       <div className="w-full p-6 rounded-lg shadow-md bg-gray-400 bg-clip-padding backdrop-filter backdrop-blur-lg bg-opacity-0">
//         <h1 className="text-3xl font-semibold text-center text-gray-300">
//           Login
//           <span className="text-blue-500"> ChatApp</span>
//         </h1>

//         <form onSubmit={handleSubmit}>
//           <div>
//             <label className="label p-2">
//               <span className="text-base label-text">Email</span>
//             </label>
//             <input
//               type="email"
//               placeholder="Enter email"
//               className="w-full input input-bordered h-10"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//             />
//           </div>

//           <div>
//             <label className="label">
//               <span className="text-base label-text">Password</span>
//             </label>
//             <input
//               type="password"
//               placeholder="Enter Password"
//               className="w-full input input-bordered h-10"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//             />
//           </div>
//           <Link
//             to="/signup"
//             className="text-sm  hover:underline hover:text-blue-600 mt-2 inline-block"
//           >
//             {"Don't"} have an account?
//           </Link>

//           <div>
//             <button className="btn btn-block btn-sm mt-2" disabled={loading}>
//               {loading ? (
//                 <span className="loading loading-spinner "></span>
//               ) : (
//                 "Login"
//               )}
//             </button>
//           </div>
//           <div className="mt-5">
//             test email : 2222@2222.2222,
//             <br /> test password: 2222@2222.2222
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };
// export default Login;
