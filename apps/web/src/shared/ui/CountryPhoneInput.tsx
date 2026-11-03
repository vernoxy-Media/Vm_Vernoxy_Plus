import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface CountryInfo {
  code: string;
  name: string;
  dialCode: string;
  flagSvg: React.ReactNode;
}

// Inline crisp SVG flags for cross-platform rendering (especially Windows where emoji flags render as raw letters)
const FLAGS: Record<string, React.ReactNode> = {
  IN: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="36" height="8" fill="#FF9933" />
      <rect y="8" width="36" height="8" fill="#FFFFFF" />
      <rect y="16" width="36" height="8" fill="#138808" />
      <circle cx="18" cy="12" r="3.2" fill="#000080" />
      <circle cx="18" cy="12" r="2.4" fill="#FFFFFF" />
      <circle cx="18" cy="12" r="0.9" fill="#000080" />
    </svg>
  ),
  US: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="36" height="24" fill="#B22234" />
      <path d="M0,2.8h36M0,6.5h36M0,10.2h36M0,13.8h36M0,17.5h36M0,21.2h36" stroke="#FFFFFF" strokeWidth="1.8" />
      <rect width="14.4" height="13" fill="#3C3B6E" />
    </svg>
  ),
  GB: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="36" height="24" fill="#012169" />
      <path d="M0,0 L36,24 M36,0 L0,24" stroke="#FFFFFF" strokeWidth="4" />
      <path d="M0,0 L36,24 M36,0 L0,24" stroke="#C8102E" strokeWidth="2.2" />
      <path d="M18,0 V24 M0,12 H36" stroke="#FFFFFF" strokeWidth="6" />
      <path d="M18,0 V24 M0,12 H36" stroke="#C8102E" strokeWidth="3.6" />
    </svg>
  ),
  AE: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="36" height="8" fill="#00732F" />
      <rect y="8" width="36" height="8" fill="#FFFFFF" />
      <rect y="16" width="36" height="8" fill="#000000" />
      <rect width="9" height="24" fill="#FF0000" />
    </svg>
  ),
  CA: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="9" height="24" fill="#FF0000" />
      <rect x="9" width="18" height="24" fill="#FFFFFF" />
      <rect x="27" width="9" height="24" fill="#FF0000" />
      <path d="M18,7 L19,10 L21,9 L20,12 L22,13 L19.5,14.5 L20,17 L18,15.5 L16,17 L16.5,14.5 L14,13 L16,12 L15,9 L17,10 Z" fill="#FF0000" />
    </svg>
  ),
  AU: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="36" height="24" fill="#00008B" />
      <rect width="18" height="12" fill="#012169" />
      <path d="M0,0 L18,12 M18,0 L0,12" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M0,0 L18,12 M18,0 L0,12" stroke="#C8102E" strokeWidth="1.2" />
      <path d="M9,0 V12 M0,6 H18" stroke="#FFFFFF" strokeWidth="3" />
      <path d="M9,0 V12 M0,6 H18" stroke="#C8102E" strokeWidth="1.8" />
      <circle cx="27" cy="6" r="1.5" fill="#FFFFFF" />
      <circle cx="31" cy="10" r="1.2" fill="#FFFFFF" />
      <circle cx="25" cy="14" r="1.2" fill="#FFFFFF" />
      <circle cx="28" cy="18" r="1.5" fill="#FFFFFF" />
      <circle cx="9" cy="18" r="2.2" fill="#FFFFFF" />
    </svg>
  ),
  SG: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="36" height="12" fill="#ED2939" />
      <rect y="12" width="36" height="12" fill="#FFFFFF" />
      <circle cx="7" cy="6" r="4" fill="#FFFFFF" />
      <circle cx="8.2" cy="6" r="3.6" fill="#ED2939" />
    </svg>
  ),
  DE: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="36" height="8" fill="#000000" />
      <rect y="8" width="36" height="8" fill="#DD0000" />
      <rect y="16" width="36" height="8" fill="#FFCE00" />
    </svg>
  ),
  FR: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="12" height="24" fill="#002654" />
      <rect x="12" width="12" height="24" fill="#FFFFFF" />
      <rect x="24" width="12" height="24" fill="#ED2939" />
    </svg>
  ),
  SA: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="36" height="24" fill="#006C35" />
      <rect x="7" y="15" width="22" height="2" fill="#FFFFFF" rx="1" />
      <rect x="10" y="8" width="16" height="4" fill="#FFFFFF" opacity="0.9" rx="1" />
    </svg>
  ),
  QA: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="36" height="24" fill="#8D1B3D" />
      <rect width="12" height="24" fill="#FFFFFF" />
      <path d="M12,0 L14,3 L12,6 L14,9 L12,12 L14,15 L12,18 L14,21 L12,24 H12 V0 Z" fill="#FFFFFF" />
    </svg>
  ),
  KW: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="36" height="8" fill="#007A3D" />
      <rect y="8" width="36" height="8" fill="#FFFFFF" />
      <rect y="16" width="36" height="8" fill="#CE1126" />
      <path d="M0,0 L9,8 L9,16 L0,24 Z" fill="#000000" />
    </svg>
  ),
  JP: (
    <svg viewBox="0 0 36 24" className="w-full h-full object-cover">
      <rect width="36" height="24" fill="#FFFFFF" />
      <circle cx="18" cy="12" r="6" fill="#BC002D" />
    </svg>
  ),
};

export const COUNTRIES: CountryInfo[] = [
  { code: 'IN', name: 'India', dialCode: '+91', flagSvg: FLAGS.IN },
  { code: 'US', name: 'United States', dialCode: '+1', flagSvg: FLAGS.US },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flagSvg: FLAGS.GB },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flagSvg: FLAGS.AE },
  { code: 'CA', name: 'Canada', dialCode: '+1', flagSvg: FLAGS.CA },
  { code: 'AU', name: 'Australia', dialCode: '+61', flagSvg: FLAGS.AU },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flagSvg: FLAGS.SG },
  { code: 'DE', name: 'Germany', dialCode: '+49', flagSvg: FLAGS.DE },
  { code: 'FR', name: 'France', dialCode: '+33', flagSvg: FLAGS.FR },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flagSvg: FLAGS.SA },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flagSvg: FLAGS.QA },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flagSvg: FLAGS.KW },
  { code: 'JP', name: 'Japan', dialCode: '+81', flagSvg: FLAGS.JP },
];

interface CountryPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (code: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  name?: string;
  error?: string;
  maxLength?: number;
}

export const CountryPhoneInput: React.FC<CountryPhoneInputProps> = ({
  value,
  onChange,
  countryCode = '+91',
  onCountryCodeChange,
  placeholder = '9876543210',
  required = false,
  disabled = false,
  id,
  name,
  error,
  maxLength,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(() => {
    const found = COUNTRIES.find((c) => c.dialCode === countryCode);
    return found || COUNTRIES[0]; // Default India
  });

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (countryCode) {
      const match = COUNTRIES.find((c) => c.dialCode === countryCode);
      if (match) setSelectedCountry(match);
    }
  }, [countryCode]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedCountry(country);
    if (onCountryCodeChange) {
      onCountryCodeChange(country.dialCode);
    }
    setIsOpen(false);
    setSearch('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '');
    onChange(cleaned);
  };

  const effectiveMaxLength = maxLength || (selectedCountry.dialCode === '+91' ? 10 : 15);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        className={`flex items-stretch bg-slate-50 border rounded-xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 ${
          error ? 'border-red-400 bg-red-50/20' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        {/* Country Selector Button matching 4th reference image with authentic SVG flag */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-2.5 bg-slate-100/90 hover:bg-slate-200/80 border-r border-slate-200 text-slate-700 transition cursor-pointer select-none shrink-0"
        >
          <div className="w-5 h-3.5 rounded-[2px] overflow-hidden shadow-2xs border border-black/10 shrink-0 flex items-center justify-center">
            {selectedCountry.flagSvg}
          </div>
          <span className="text-xs font-bold font-mono tracking-tight text-slate-800 leading-none">
            {selectedCountry.dialCode}
          </span>
          <ChevronDown
            className={`w-3 h-3 text-slate-400 transition-transform duration-150 shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Phone input */}
        <input
          type="tel"
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          value={value}
          onChange={handleInputChange}
          maxLength={effectiveMaxLength}
          placeholder={placeholder}
          className="flex-1 px-3.5 py-2.5 bg-transparent text-xs sm:text-[13.5px] text-slate-900 placeholder-slate-400 focus:outline-hidden font-medium"
        />
      </div>

      {/* Country Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-blue-500 transition"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
            {filteredCountries.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center py-2">No countries found</p>
            ) : (
              filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectCountry(c)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                    selectedCountry.code === c.code
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-3.5 rounded-[2px] overflow-hidden shadow-2xs border border-black/10 shrink-0">
                      {c.flagSvg}
                    </div>
                    <span className="truncate max-w-[125px] font-medium">{c.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">{c.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && <p className="text-[11px] text-red-500 font-medium mt-1">{error}</p>}
    </div>
  );
};
