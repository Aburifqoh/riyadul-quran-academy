'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Country, COUNTRIES } from '@/lib/countries';

interface CountryPhoneInputProps {
  value: string; // e.g. "+234 8012345678"
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export function CountryPhoneInput({ value, onChange, className, required }: CountryPhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize state based on value
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [localNumber, setLocalNumber] = useState('');

  // Sync incoming value (for initial load)
  useEffect(() => {
    if (value) {
      const matched = COUNTRIES.find(c => c.dialCode !== '' && value.startsWith(c.dialCode));
      if (matched) {
        setSelectedCountry(matched);
        setLocalNumber(value.substring(matched.dialCode.length).trim());
      } else {
        setLocalNumber(value);
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearch('');
    updateParent(country.dialCode, localNumber);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value;
    setLocalNumber(num);
    updateParent(selectedCountry.dialCode, num);
  };

  const updateParent = (dialCode: string, num: string) => {
    if (!num) onChange('');
    else onChange(`${dialCode} ${num}`.trim());
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 pl-4 pr-3 py-3 md:py-3.5 bg-zinc-50 border-2 border-border-subtle border-r-0 rounded-l-xl hover:bg-white transition-colors focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary h-full shadow-sm"
        >
          <span className="text-xl leading-none">{selectedCountry.flag}</span>
          <span className="text-sm font-medium text-gray-700 ml-1">{selectedCountry.dialCode}</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-[280px] bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden z-50">
            <div className="p-2 border-b border-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Search country or code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-[240px] overflow-y-auto p-1 custom-scrollbar">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No countries found</div>
              ) : (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={cn(
                      "flex items-center w-full gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-colors hover:bg-orange-50",
                      selectedCountry.code === country.code && "bg-orange-50 text-primary font-medium"
                    )}
                  >
                    <span className="text-xl">{country.flag}</span>
                    <span className="flex-1 truncate">{country.name}</span>
                    <span className="text-gray-500">{country.dialCode}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <input
        type="tel"
        className="w-full bg-zinc-50 border-2 border-border-subtle rounded-r-xl px-4 py-3 md:py-3.5 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium text-text-body hover:bg-white placeholder:text-text-muted placeholder:font-normal shadow-sm"
        value={localNumber}
        onChange={handleNumberChange}
        placeholder="Phone number"
        required={required}
      />
    </div>
  );
}
