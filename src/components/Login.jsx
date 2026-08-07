import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Lock, Mail, User, Eye, EyeOff } from "lucide-react";
import { login, register, getHealth } from "../lib/api.js";

export default function Login({ theme, onToggleTheme, onLogin }) {
  const [mode, setMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  const googleInit = useRef(false);

  // Load Google Client ID (public) + init GIS for the Google button.
  useEffect(() => {
    getHealth()
      .then((h) => setGoogleClientId(h.googleClientId || ""))
      .catch(() => {});
  }, []);

  const handleGoogleClick = () => {
    if (!googleClientId || !window.google) return;
    if (!googleInit.current) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (resp) => {
          if (resp?.credential) onLogin({ google: resp.credential });
        },
      });
      googleInit.current = true;
    }
    window.google.accounts.id.prompt();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r =
        mode === "login"
          ? await login(identifier, password)
          : await register(email, password, name);
      onLogin({ token: r.token, user: r.user });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full pl-9 pr-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-white/10 focus:outline-none focus:border-gray-500 dark:focus:border-white/40 text-sm min-h-[44px]";

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-[#0b0f17] text-gray-900 dark:text-gray-200 relative overflow-y-auto">
      <button
        className="absolute top-4 right-4 p-2.5 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        onClick={onToggleTheme}
        title={theme === "dark" ? "Mode Terang" : "Mode Gelap"}
      >
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-sm mx-4 py-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/favicon.svg" alt="DMLab Watch" className="w-16 h-16 rounded-2xl mb-3" />
          <h1 className="text-2xl font-bold">DMLab Watch</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Multi Layar 3×3 Live CCTV</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl"
        >
          {mode === "register" && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5">Nama</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nama kamu" autoFocus />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">
              {mode === "login" ? "Email atau Username" : "Email"}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                value={mode === "login" ? identifier : email}
                onChange={(e) => (mode === "login" ? setIdentifier(e.target.value) : setEmail(e.target.value))}
                autoFocus={mode !== "register"}
                autoComplete="email"
                className={inputCls}
                placeholder={mode === "login" ? "email@contoh.com atau admin-dml" : "email@contoh.com"}
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
                className={`${inputCls} pr-10`}
                placeholder="••••••"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[32px] min-h-[32px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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
            className="w-full min-h-[46px] py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-gray-200 dark:hover:bg-white dark:text-gray-900 text-white text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 border-t border-gray-200 dark:border-white/10" />
            <span className="text-xs text-gray-400 dark:text-gray-500">atau</span>
            <div className="flex-1 border-t border-gray-200 dark:border-white/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={!googleClientId}
            className="w-full min-h-[46px] py-2.5 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Masuk dengan Google
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
