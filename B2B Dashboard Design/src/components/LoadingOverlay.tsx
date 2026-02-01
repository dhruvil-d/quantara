import * as React from "react";
import { Loader2, CheckCircle2, XCircle, Sun, Moon } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  progress: number;
  logs: string[];
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

export function LoadingOverlay({ isVisible, progress, logs, isDarkMode = false, toggleTheme }: LoadingOverlayProps) {
  if (!isVisible) return null;

  const latestLog = logs[logs.length - 1] || "";
  const isError = latestLog.startsWith("✗");
  const isComplete = latestLog.includes("✓") || progress >= 100;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">

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
      {toggleTheme && (
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
      )}

      {/* Centered Content */}
      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-4">

        {/* Glassmorphic Card */}
        <div className="w-full max-w-2xl bg-white/20 dark:bg-gray-900/30 backdrop-blur-2xl rounded-3xl p-10 border border-white/30 dark:border-white/10 shadow-2xl transition-all duration-700 ease-in-out">

          {/* Header with Icon */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              {isError ? (
                <XCircle className="w-16 h-16 text-red-500 animate-pulse" />
              ) : isComplete ? (
                <CheckCircle2 className="w-16 h-16 text-emerald-500 animate-bounce" />
              ) : (
                <Loader2 className="w-16 h-16 text-emerald-500 animate-spin" />
              )}
            </div>
            <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white transition-colors duration-500">
              {isError ? "Error" : isComplete ? "Analysis Complete" : "Analyzing Routes"}
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-500">
              {isError ? "Failed to analyze routes" : isComplete ? "Routes are ready" : "Processing your route request..."}
            </p>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="mb-8">
            <div className="relative h-4 rounded-full overflow-hidden bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm border border-white/20 dark:border-gray-700/20">
              <div
                className={`h-full transition-all duration-500 ease-out relative overflow-hidden ${isError
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                  }`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              >
                {/* Shimmer effect */}
                {!isComplete && !isError && (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                    style={{
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s infinite'
                    }}
                  />
                )}
              </div>
            </div>
            <div className="flex justify-between mt-3">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 transition-colors duration-500">
                {Math.round(progress)}% Complete
              </span>
              {!isComplete && !isError && (
                <span className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-500 animate-pulse">
                  Please wait...
                </span>
              )}
            </div>
          </div>

          {/* Logs Section */}
          <div className="max-h-64 overflow-y-auto rounded-xl p-5 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm border border-white/30 dark:border-gray-700/30 shadow-inner transition-all duration-500">
            <div className="text-xs font-mono space-y-2 text-gray-800 dark:text-gray-200">
              {logs.length === 0 ? (
                <div className="text-gray-600 dark:text-gray-400 animate-pulse">Initializing analysis...</div>
              ) : (
                logs.map((log, index) => {
                  const isErrorLog = log.startsWith("✗");
                  const isSuccessLog = log.includes("✓");
                  return (
                    <div
                      key={index}
                      className={`py-1.5 px-2 rounded transition-all duration-300 ${isErrorLog
                        ? 'text-red-600 dark:text-red-400 bg-red-100/50 dark:bg-red-900/20'
                        : isSuccessLog
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/20'
                          : 'text-gray-700 dark:text-gray-300'
                        }`}
                    >
                      <span className="opacity-60 mr-2">[{new Date().toLocaleTimeString()}]</span>
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Latest Status Message */}
          {latestLog && (
            <div className="mt-6 text-center">
              <div className="inline-block px-6 py-3 bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm rounded-full border border-white/20 dark:border-gray-700/20 transition-all duration-500">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {latestLog}
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

