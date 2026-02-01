import { useState, useEffect } from "react";
import axios from "axios";
import { Eye, EyeOff, Sun, Moon } from "lucide-react";

type Mode = "login" | "signup";

export default function AuthPage() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (mode === "login") {
        const res = await axios.post("http://localhost:5000/auth/login", {
          email: form.email,
          password: form.password,
        });

        localStorage.setItem("token", res.data.token);
        if (res.data.user && res.data.user.name) {
          localStorage.setItem("userName", res.data.user.name);
        }
        window.location.reload();
      }

      if (mode === "signup") {
        await axios.post("http://localhost:5000/auth/signup", {
          name: form.name,
          email: form.email,
          password: form.password,
        });

        setMode("login");
        setError("");
        alert("Account created! Please sign in.");
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        "Authentication failed. Please try again.";
      setError(errorMessage);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">

      {/* Full-Screen Background Images */}
      {/* Dark mode background */}
      <img
        src="/green-liquid-bg.png"
        alt="Abstract liquid background"
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${isDarkMode ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
      />

      {/* Light mode background */}
      <img
        src="/green-liquid-light-bg.png"
        alt="Abstract liquid background light"
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-in-out ${isDarkMode ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
          }`}
      />

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-full shadow-2xl transition-all duration-500 ease-in-out hover:scale-110 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-2 border-gray-200/50 dark:border-gray-700/50"
        title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        <div className="relative w-6 h-6">
          <Sun className={`absolute inset-0 w-6 h-6 text-amber-500 transition-all duration-500 ${isDarkMode ? 'rotate-180 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
            }`} />
          <Moon className={`absolute inset-0 w-6 h-6 text-blue-400 transition-all duration-500 ${isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-180 scale-0 opacity-0'
            }`} />
        </div>
      </button>

      {/* Centered Content Container */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-4 gap-6">

        {/* Glassmorphic Form Card */}
        <div className="w-full max-w-md bg-white/20 dark:bg-gray-900/30 backdrop-blur-2xl rounded-3xl p-10 border border-white/30 dark:border-white/10 shadow-2xl transition-all duration-700 ease-in-out">

          {/* Logo/Brand */}
          <div className="mb-8 transition-all duration-500 text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white transition-colors duration-500 mb-2">Quantara</h1>
          </div>

          {/* Toggle Tabs - Glassmorphic Pills */}
          <div className="relative mb-8 p-1.5 bg-gradient-to-r from-gray-200/50 to-gray-300/50 dark:from-gray-800/50 dark:to-gray-700/50 backdrop-blur-xl rounded-full border border-gray-300/20 dark:border-gray-600/20 shadow-lg transition-all duration-500">
            {/* Sliding background pill */}
            <div
              className="absolute top-1.5 h-[calc(100%-12px)] bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full shadow-xl shadow-emerald-500/30 dark:shadow-emerald-500/20 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{
                width: 'calc(50% - 6px)',
                left: mode === 'login' ? '6px' : 'calc(50% + 0px)',
              }}
            />

            <div className="relative flex gap-1">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-3 px-6 rounded-full font-semibold z-10 transition-all duration-500 ${mode === "login"
                  ? "text-white scale-105"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white scale-100"
                  }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-3 px-6 rounded-full font-semibold z-10 transition-all duration-500 ${mode === "signup"
                  ? "text-white scale-105"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white scale-100"
                  }`}
              >
                Sign Up
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50/90 dark:bg-red-900/30 backdrop-blur-sm border border-red-200/50 dark:border-red-800/50 rounded-lg animate-shake transition-all duration-300">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="animate-slideDown">
                <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 transition-colors duration-500">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-400/30 dark:border-gray-600/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all duration-300"
                  required={mode === "signup"}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 transition-colors duration-500">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-400/30 dark:border-gray-600/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all duration-300"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 transition-colors duration-500">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-400/30 dark:border-gray-600/30 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all duration-300"
                  required
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <div className="flex items-center justify-between animate-slideDown">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-gray-400 focus:ring-emerald-500 transition-all duration-300"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium transition-all duration-300 hover:translate-x-1"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/30 transition-all duration-500 ease-out hover:shadow-xl hover:shadow-emerald-500/50 hover:-translate-y-1 hover:scale-[1.02]"
            >
              {mode === "login" ? "Login" : "Sign Up"}
            </button>
          </form>

        </div>

        {/* Tagline Pill Below Card */}
        <div className="w-full max-w-md">
          <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/20 dark:border-white/10 transition-all duration-500">
            <p className="text-gray-800 dark:text-white/90 text-sm text-center font-medium transition-colors duration-500">
              AI-Powered B2B Route Intelligence Platform
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
