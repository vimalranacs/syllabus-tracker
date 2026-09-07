import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { verifyAndUnlock, isAccessGranted, getActiveProfile } from "../services/authService";
import { useStudyStore } from "../store/studyStore";
import { Lock, ArrowRight } from "lucide-react";

export default function Login() {
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { setUser, loadSyllabus, loadStudentData, subscribeToStudentData } = useStudyStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAccessGranted()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!accessCode.trim()) {
      setError("Please enter the access code.");
      return;
    }

    setLoading(true);
    const success = await verifyAndUnlock(accessCode.trim());

    if (success) {
      const profile = await getActiveProfile();
      setUser(profile);
      await loadSyllabus();

      if (profile) {
        await loadStudentData(profile.uid);
        subscribeToStudentData(profile.uid);
      }

      setLoading(false);
      navigate("/dashboard", { replace: true });
    } else {
      setLoading(false);
      setError("Incorrect access code");
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f9] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Minimal header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 shadow-xs mb-1">
            <Lock className="w-5 h-5 text-pink-500" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
            UPPSC RO / ARO
          </h1>
          <p className="text-xs text-zinc-400">
            Study & Progress Tracker
          </p>
        </div>

        {/* Access Code Form */}
        <div className="bg-white rounded-2xl shadow-xs border border-zinc-200/80 p-6 space-y-5">
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-xs font-semibold text-zinc-600 mb-1.5 uppercase tracking-wider text-center">
                Enter access code
              </label>
              <input
                id="code"
                type="password"
                value={accessCode}
                onChange={e => {
                  setAccessCode(e.target.value);
                  if (error) setError("");
                }}
                autoFocus
                placeholder="••••••••••"
                className={"w-full px-3.5 py-2.5 rounded-xl border text-sm text-center tracking-widest font-mono focus:outline-none transition-all " +
                  (error
                    ? "border-red-400 bg-red-50/30 text-red-700 focus:ring-2 focus:ring-red-200"
                    : "border-zinc-200 bg-zinc-50/50 focus:border-pink-400 focus:ring-2 focus:ring-pink-100")}
              />
              {error && (
                <p className="text-xs text-red-500 font-medium text-center mt-2">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-pink-500 hover:bg-pink-600 active:scale-[0.99] text-white rounded-xl text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? "Verifying..." : "Enter"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
