import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { api, getScorerId, setScorer } from "../lib/api";
import { inputCls, labelCls, primaryBtnCls } from "../lib/formStyles";

const Login = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const existingId = getScorerId();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        await api.post("/scorer/signup", { fullName, email, password });
        setNotice("Account created. Now log in with your credentials.");
        setMode("login");
        setPassword("");
      } else {
        const res = await api.post("/scorer/login", { email, password });
        const user = res?.user || res?.data?.user || res?.data || null;
        const id = user?.id || user?._id;
        if (!id) {
          throw new Error("Login succeeded but no scorer id was returned.");
        }
        setScorer(String(id), user.fullName || "");
        navigate("/score");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md surface-card p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 text-center">
          Scorer Account
        </p>
        <h1 className="mt-2 font-condensed font-bold uppercase tracking-wide text-4xl leading-none text-heading text-center">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="text-sm text-subheading text-center mt-2">
          Score your matches ball by ball, live.
        </p>

        {existingId && mode === "login" && (
          <div className="mt-4 text-sm text-center bg-secondary rounded-xl p-3 text-heading">
            You are already signed in.{" "}
            <Link to="/score" className="text-emerald-500 font-semibold">
              Go to my matches →
            </Link>
          </div>
        )}

        {notice && (
          <div className="mt-4 text-sm bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl p-3">
            {notice}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="mt-4 text-sm bg-red-500/15 text-red-600 dark:text-red-400 rounded-xl p-3"
          >
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label htmlFor="fullName" className={labelCls}>
                Full name
              </label>
              <input
                id="fullName"
                className={inputCls}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                placeholder="e.g. Samir Khadka"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              id="email"
              type="email"
              className={inputCls}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className={labelCls}>
              Password
            </label>
            <input
              id="password"
              type="password"
              className={inputCls}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={busy} className={`${primaryBtnCls} w-full`}>
            {mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Login & Start Scoring"
                : "Create Account"}
          </button>
        </form>

        <p className="text-sm text-subheading text-center mt-5">
          {mode === "login" ? (
            <>
              New to CricScore?{" "}
              <button
                type="button"
                className="text-emerald-500 font-semibold cursor-pointer"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setNotice(null);
                }}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="text-emerald-500 font-semibold cursor-pointer"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setNotice(null);
                }}
              >
                Login
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;
