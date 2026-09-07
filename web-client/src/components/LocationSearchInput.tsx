import React, { useState, useEffect, useRef, useId } from 'react';
import { SearchIcon, CloseIcon } from './ui/Icons';
import { searchLocations, type GeocodeLocation } from '../api/geocode';

export interface Location {
  name: string;
  lat: number;
  lon: number;
}

interface Props {
  placeholder: string;
  onSelect: (location: Location | null) => void;
  initialValue?: string;
  icon?: React.ReactNode;
  autoFocus?: boolean;
}

export const LocationSearchInput: React.FC<Props> = ({ 
  placeholder, 
  onSelect, 
  initialValue = "", 
  icon 
}) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<GeocodeLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<any>(null);
  const isSelectedRef = useRef(false);
  const listboxId = useId();

  useEffect(() => {
    isSelectedRef.current = true;
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (isSelectedRef.current) {
      isSelectedRef.current = false;
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchLocations(query, 5);
        setSuggestions(data || []);
        setShowDropdown((data || []).length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Geocoding lookup error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (s: GeocodeLocation) => {
    isSelectedRef.current = true;
    const location: Location = {
      name: s.display_name,
      lat: parseFloat(String(s.lat)),
      lon: parseFloat(String(s.lon))
    };
    setQuery(s.display_name);
    setSuggestions([]);
    setShowDropdown(false);
    onSelect(location);
  };

  const handleClear = () => {
    isSelectedRef.current = true;
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    onSelect(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div className="location-search-container" ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {/* Leading Icon */}
        <span style={{ 
          position: "absolute", 
          left: "14px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          pointerEvents: "none",
          color: "#10b981",
          zIndex: 1 
        }}>
          {icon || <SearchIcon size={16} color="#64748b" />}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            isSelectedRef.current = false;
            setQuery(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          style={{
            width: "100%",
            height: "44px",
            padding: "0 40px 0 42px",
            borderRadius: "10px",
            border: "1px solid rgba(0, 240, 255, 0.2)",
            fontSize: "13.5px",
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            color: "#f8fafc",
            outline: "none",
            transition: "all 0.15s ease",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.4)"
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = "#00f0ff";
            e.currentTarget.style.boxShadow = "0 0 12px rgba(0, 240, 255, 0.25)";
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = "rgba(0, 240, 255, 0.2)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.4)";
          }}
        />

        {/* Loading Spinner */}
        {loading && (
          <div style={{ position: "absolute", right: query ? "34px" : "14px", display: "flex", alignItems: "center" }}>
            <div style={{
              width: "14px",
              height: "14px",
              border: "2px solid rgba(0, 240, 255, 0.2)",
              borderTop: "2px solid #00f0ff",
              borderRadius: "50%",
              animation: "locationSearchSpin 0.7s linear infinite"
            }} />
          </div>
        )}

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: "absolute",
              right: "10px",
              width: "24px",
              height: "24px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              transition: "all 0.15s ease"
            }}
            title="Clear location"
          >
            <CloseIcon size={12} />
          </button>
        )}
      </div>

      {/* Geocoding Dropdown Suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <div 
          id={listboxId}
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "rgba(15, 23, 42, 0.96)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: "12px",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.7), 0 0 16px rgba(0, 240, 255, 0.15)",
            zIndex: 2500,
            maxHeight: "280px",
            overflowY: "auto",
            border: "1px solid rgba(0, 240, 255, 0.25)",
            padding: "6px"
          }}
        >
          {suggestions.map((s, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={idx}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(s)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  backgroundColor: isSelected ? "rgba(0, 240, 255, 0.15)" : "transparent",
                  transition: "background-color 0.1s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px"
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "12px" }}>📍</span>
                  <span style={{ fontWeight: "700", color: isSelected ? "#00f0ff" : "#f8fafc", fontSize: "13px" }}>
                    {s.name || s.display_name.split(',')[0]}
                  </span>
                </div>
                <span style={{ 
                  fontSize: "11px", 
                  color: "#94a3b8", 
                  whiteSpace: "nowrap", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis",
                  paddingLeft: "18px"
                }}>
                  {s.display_name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes locationSearchSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LocationSearchInput;
