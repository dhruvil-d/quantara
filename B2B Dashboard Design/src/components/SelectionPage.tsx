
import * as React from "react";
import { Moon, Sun, ArrowRight, MapPin, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

interface SelectionPageProps {
    onContinue: (source: string, destination: string) => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
    osmnxEnabled: boolean;
    onToggleOsmnx: (value: boolean) => void;
}

const CITIES = [
    "Mumbai",
    "Delhi",
    "Bangalore",
    "Chennai",
    "Kolkata",
];

export function SelectionPage({ onContinue, isDarkMode, toggleTheme, osmnxEnabled, onToggleOsmnx }: SelectionPageProps) {
    const [source, setSource] = useState<string>("");
    const [destination, setDestination] = useState<string>("");

    const availableDestinations = CITIES.filter((city) => city !== source);

    const handleSourceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSource(e.target.value);
        // Reset destination if it's the same as the new source (though filtered out, just to be safe)
        if (e.target.value === destination) {
            setDestination("");
        }
    };

    const handleContinue = () => {
        if (source && destination) {
            onContinue(source, destination);
        }
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

            {/* Top Right Controls - Theme Toggle + Logout */}
            <div className="fixed top-6 right-6 z-50 flex items-center gap-3">
                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    className="p-3 rounded-full shadow-2xl transition-all duration-500 ease-in-out hover:scale-110 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-2 border-gray-200/50 dark:border-gray-700/50"
                    title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    <div className="relative w-6 h-6">
                        <Sun className={`absolute inset-0 w-6 h-6 text-amber-500 transition-all duration-500 ${isDarkMode ? 'rotate-180 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                            }`} />
                        <Moon className={`absolute inset-0 w-6 h-6 text-blue-400 transition-all duration-500 ${isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-180 scale-0 opacity-0'
                            }`} />
                    </div>
                </button>

                {/* Logout Button */}
                <button
                    onClick={() => {
                        localStorage.removeItem("token");
                        localStorage.removeItem("userName");
                        window.location.reload();
                    }}
                    className="px-5 py-2.5 rounded-full shadow-2xl font-semibold transition-all duration-500 ease-in-out hover:scale-105 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                >
                    Logout
                </button>
            </div>

            {/* Centered Content Container */}
            <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-4 gap-6">

                {/* Glassmorphic Form Card */}
                <div className="w-full max-w-md bg-white/20 dark:bg-gray-900/30 backdrop-blur-2xl rounded-3xl p-10 border border-white/30 dark:border-white/10 shadow-2xl transition-all duration-700 ease-in-out">

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform duration-500 hover:rotate-12">
                            <MapPin className="w-8 h-8 text-white" />
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="text-center mb-8 transition-all duration-500">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-500 mb-2">
                            Welcome, {localStorage.getItem("userName")?.split(" ")[0] || "User"}
                        </h1>
                        <p className="text-sm text-gray-700 dark:text-gray-300 transition-colors duration-500">
                            Select your origin and destination to get started
                        </p>
                    </div>

                    <div className="space-y-6">
                        {/* Source City Dropdown */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 transition-colors duration-500">
                                Source City
                            </label>
                            <div className="relative group">
                                <select
                                    value={source}
                                    onChange={handleSourceChange}
                                    className="w-full px-4 py-3.5 pr-10 rounded-xl border-2 border-emerald-500 dark:border-emerald-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md text-gray-900 dark:text-white font-medium appearance-none outline-none cursor-pointer transition-all duration-300 focus:ring-4 focus:ring-emerald-500/50 focus:border-emerald-600 hover:border-emerald-600 hover:bg-white/90 dark:hover:bg-gray-800/90 shadow-xl shadow-emerald-500/20"
                                >
                                    <option value="" disabled hidden>Select Origin</option>
                                    {CITIES.map((city) => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 dark:text-emerald-400 pointer-events-none transition-transform duration-300 group-hover:translate-y-[-45%]" />
                            </div>
                        </div>

                        {/* Destination City Dropdown */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-2 transition-colors duration-500">
                                Destination City
                            </label>
                            <div className="relative group">
                                <select
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    disabled={!source}
                                    className={`w-full px-4 py-3.5 pr-10 rounded-xl border-2 border-emerald-500 dark:border-emerald-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md text-gray-900 dark:text-white font-medium appearance-none outline-none cursor-pointer transition-all duration-300 focus:ring-4 focus:ring-emerald-500/50 focus:border-emerald-600 hover:border-emerald-600 hover:bg-white/90 dark:hover:bg-gray-800/90 shadow-xl shadow-emerald-500/20 ${!source ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                >
                                    <option value="" disabled hidden>
                                        {source ? "Select Destination" : "Select Source First"}
                                    </option>
                                    {availableDestinations.map((city) => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                                <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-600 dark:text-emerald-400 pointer-events-none transition-transform duration-300 ${source ? 'group-hover:translate-y-[-45%]' : ''
                                    }`} />
                            </div>
                        </div>

                        {/* OSMnx Checkbox */}
                        <div className="flex items-center justify-between pt-2">
                            <label
                                className="flex items-center gap-2 cursor-pointer group"
                                title="Enabling this option will increase accuracy but also increase the processing time"
                            >
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-emerald-600 rounded border-gray-400 focus:ring-emerald-500 transition-all duration-300"
                                    checked={osmnxEnabled}
                                    onChange={(e) => onToggleOsmnx(e.target.checked)}
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">
                                    Use detailed road data (OSMnx)
                                </span>
                            </label>
                        </div>

                        {/* Find Routes Button */}
                        <button
                            onClick={handleContinue}
                            disabled={!source || !destination}
                            className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all duration-500 ease-out ${source && destination
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/50 hover:-translate-y-1 hover:scale-[1.02]'
                                    : 'bg-gray-300/50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 cursor-not-allowed backdrop-blur-sm'
                                }`}
                        >
                            Find Routes
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>

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
