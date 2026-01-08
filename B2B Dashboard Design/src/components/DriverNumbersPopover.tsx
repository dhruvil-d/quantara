import * as React from "react";
import { Phone, Plus, X, Check, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface DriverNumbersPopoverProps {
    routeId?: string;
    dbRouteId?: string;
    driverNumbers?: string[];
    isDarkMode?: boolean;
    onNumbersChange?: (numbers: string[]) => void;
}

export function DriverNumbersPopover({
    routeId,
    dbRouteId,
    driverNumbers: initialNumbers = [],
    isDarkMode = false,
    onNumbersChange
}: DriverNumbersPopoverProps) {
    const [numbers, setNumbers] = React.useState<string[]>(initialNumbers);
    const [newNumber, setNewNumber] = React.useState("");
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);

    // Use dbRouteId (MongoDB _id) if available, otherwise fall back to routeId
    const effectiveRouteId = dbRouteId || routeId;

    // Fetch driver numbers when popover opens
    React.useEffect(() => {
        if (isOpen && effectiveRouteId) {
            setIsLoading(true);
            fetch(`http://localhost:5000/driver-numbers/${effectiveRouteId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.driver_numbers) {
                        setNumbers(data.driver_numbers);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch driver numbers:", err);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isOpen, effectiveRouteId]);

    // Sync with initial numbers prop
    React.useEffect(() => {
        if (initialNumbers.length > 0) {
            setNumbers(initialNumbers);
        }
    }, [initialNumbers]);

    const validatePhoneNumber = (phone: string): boolean => {
        // Only allow exactly 10 digits
        const digitsOnly = phone.replace(/\D/g, '');
        return digitsOnly.length === 10;
    };

    const handleAddNumber = () => {
        const trimmed = newNumber.trim();
        if (!trimmed) return;

        if (numbers.length >= 5) {
            setError("Maximum 5 driver numbers allowed");
            return;
        }

        if (!validatePhoneNumber(trimmed)) {
            setError("Please enter a valid 10-digit phone number");
            return;
        }

        if (numbers.includes(trimmed)) {
            setError("This number is already added");
            return;
        }

        const updatedNumbers = [...numbers, trimmed];
        setNumbers(updatedNumbers);
        setNewNumber("");
        setError(null);
        saveNumbers(updatedNumbers);
    };

    const handleRemoveNumber = (index: number) => {
        const updatedNumbers = numbers.filter((_, i) => i !== index);
        setNumbers(updatedNumbers);
        saveNumbers(updatedNumbers);
    };

    const saveNumbers = async (numbersToSave: string[]) => {
        if (!effectiveRouteId) {
            // Silently skip saving - route not saved yet (simulation mode)
            console.warn("No route ID available for saving driver numbers");
            return;
        }

        // Check if it's a valid MongoDB ObjectId (24 hex characters)
        const isValidObjectId = /^[a-fA-F0-9]{24}$/.test(effectiveRouteId);
        if (!isValidObjectId) {
            // Silently skip saving - route not saved to database yet (simulation mode)
            console.warn("Invalid MongoDB ObjectId:", effectiveRouteId);
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`http://localhost:5000/driver-numbers/${effectiveRouteId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ driver_numbers: numbersToSave })
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error || "Failed to save");
                return;
            }

            onNumbersChange?.(numbersToSave);
        } catch (err) {
            console.error("Failed to save driver numbers:", err);
            setError("Failed to save numbers");
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddNumber();
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(true);
                    }}
                    className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-colors ${isDarkMode
                        ? 'bg-gray-600 hover:bg-gray-500'
                        : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                >
                    <Phone className={`w-3.5 h-3.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                    {numbers.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-lime-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                            {numbers.length}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                className={`w-72 p-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                side="top"
                align="end"
            >
                <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Driver Numbers
                        </h4>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {numbers.length}/5
                        </span>
                    </div>

                    {/* Loading state */}
                    {isLoading && (
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-center py-2`}>
                            Loading...
                        </div>
                    )}

                    {/* Numbers list */}
                    {!isLoading && numbers.length > 0 && (
                        <div className="space-y-2">
                            {numbers.map((number, index) => (
                                <div
                                    key={index}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Phone className={`w-3.5 h-3.5 ${isDarkMode ? 'text-lime-400' : 'text-lime-600'}`} />
                                        <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                                            {number}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveNumber(index)}
                                        className={`p-1 rounded-full transition-colors ${isDarkMode
                                            ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400'
                                            : 'hover:bg-gray-200 text-gray-400 hover:text-red-500'
                                            }`}
                                        title="Remove number"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty state */}
                    {!isLoading && numbers.length === 0 && (
                        <div className={`text-xs text-center py-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            No driver numbers added yet
                        </div>
                    )}

                    {/* Add new number */}
                    {numbers.length < 5 && (
                        <div className="flex gap-2">
                            <input
                                type="tel"
                                value={newNumber}
                                onChange={(e) => {
                                    // Only allow digits, max 10
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setNewNumber(value);
                                    setError(null);
                                }}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter 10-digit number..."
                                maxLength={10}
                                className={`flex-1 px-3 py-2 text-sm rounded-lg border outline-none transition-colors ${isDarkMode
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:border-lime-500'
                                    : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-lime-500'
                                    }`}
                            />
                            <button
                                onClick={handleAddNumber}
                                disabled={!newNumber.trim() || isSaving}
                                className={`p-2 rounded-lg transition-colors ${newNumber.trim()
                                    ? isDarkMode
                                        ? 'bg-lime-600 hover:bg-lime-500 text-white'
                                        : 'bg-lime-500 hover:bg-lime-600 text-white'
                                    : isDarkMode
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {isSaving ? (
                                    <Check className="w-4 h-4 animate-pulse" />
                                ) : (
                                    <Plus className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div className="flex items-center gap-1.5 text-xs text-red-500">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {error}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
