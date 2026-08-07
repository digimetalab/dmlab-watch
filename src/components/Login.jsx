import { useState } from "react";
import { Sun, Moon, Lock, User, Eye, EyeOff } from "lucide-react";
import { login, register } from "../lib/api.js";

export default function Login({ theme, onToggleTheme, onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = mode === "login" ? await login(username, password) : await register(username, password);
      onLogin(r.token, r.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-[#0b0f17] text-gray-900 dark:text-gray-200 relative">
      <button
        className="absolute top-4 right-4 p-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        onClick={onToggleTheme}
        title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
      >
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-6">
          <img src="/favicon.svg" alt="DML CCTV" className="w-16 h-16 rounded-2xl mb-3" />
          <h1 className="text-2xl font-bold">DML CCTV</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Multi Layar 3×3 Live CCTV</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-xl"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-white/10 focus:outline-none focus:border-gray-500 dark:focus:border-white/40 text-sm"
                placeholder="admin-dml"
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className="w-full pl-9 pr-10 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-white/10 focus:outline-none focus:border-gray-500 dark:focus:border-white/40 text-sm"
                placeholder="••••••"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                onClick={() => setShowPw((v) => !v)}
                title={showPw ? "Sembunyikan" : "Tampilkan"}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-white dark:text-gray-900 text-white text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>

          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {mode === "login" ? (
              <>
                Belum punya akun?{" "}
                <button type="button" className="text-gray-900 dark:text-white underline" onClick={() => { setMode("register"); setError(null); }}>
                  Daftar
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{" "}
                <button type="button" className="text-gray-900 dark:text-white underline" onClick={() => { setMode("login"); setError(null); }}>
                  Masuk
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
