import React, { useState, useMemo } from 'react';
import Highlighter from 'react-highlight-words';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { performArabicFuzzySearch, FuzzySearchResult } from '@/utils/fuzzySearch';

interface FuzzySearchInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  className?: string;
  disabled?: boolean;
  showClearButton?: boolean;
}

interface FuzzySearchHighlighterProps {
  text: string;
  searchWords?: string[];
  className?: string;
  highlightClassName?: string;
  caseSensitive?: boolean;
}

/**
 * Enhanced search input with fuzzy search capabilities
 */
export function FuzzySearchInput({
  placeholder = "البحث...",
  value = "",
  onChange,
  onClear,
  className = "",
  disabled = false,
  showClearButton = true
}: FuzzySearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleClear = () => {
    onChange?.("");
    onClear?.();
  };

  return (
    <div className={`relative ${className}`}>
      <Search 
        className={`absolute right-3 top-3 h-4 w-4 transition-colors ${
          isFocused ? 'text-primary' : 'text-muted-foreground'
        }`} 
      />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className={`pr-10 ${showClearButton && value ? 'pl-10' : ''} olive-input`}
      />
      {showClearButton && value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute left-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted p-0.5"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/**
 * Text highlighter component for fuzzy search results
 */
export function FuzzySearchHighlighter({
  text,
  searchWords = [],
  className = "",
  highlightClassName = "bg-yellow-200 text-yellow-900 px-1 rounded",
  caseSensitive = false
}: FuzzySearchHighlighterProps) {
  if (!text) return <span className={className}></span>;

  if (!searchWords.length) {
    return <span className={className}>{text}</span>;
  }

  return (
    <Highlighter
      highlightClassName={highlightClassName}
      searchWords={searchWords}
      autoEscape={true}
      textToHighlight={text}
      caseSensitive={caseSensitive}
      className={className}
    />
  );
}

/**
 * Hook for fuzzy search functionality
 */
export function useFuzzySearch<T>(
  data: T[],
  searchQuery: string,
  searchKeys: string[],
  options?: {
    threshold?: number;
    minSearchLength?: number;
    maxResults?: number;
  }
) {
  const {
    threshold = 0.4,
    minSearchLength = 2,
    maxResults = 100
  } = options || {};

  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < minSearchLength) {
      return {
        results: data.map((item, index) => ({ item, refIndex: index })),
        searchWords: [],
        hasSearch: false
      };
    }

    const fuzzyResults = performArabicFuzzySearch(
      data,
      searchQuery,
      searchKeys,
      { threshold }
    );

    const limitedResults = maxResults > 0 
      ? fuzzyResults.slice(0, maxResults)
      : fuzzyResults;

    // Extract search words for highlighting
    const searchWords = searchQuery
      .trim()
      .split(/\s+/)
      .filter(word => word.length >= 2);

    return {
      results: limitedResults,
      searchWords,
      hasSearch: true
    };
  }, [data, searchQuery, searchKeys, threshold, minSearchLength, maxResults]);

  return searchResults;
}

/**
 * Search statistics component
 */
interface SearchStatsProps {
  totalResults: number;
  searchQuery: string;
  hasSearch: boolean;
  className?: string;
}

export function SearchStats({ 
  totalResults, 
  searchQuery, 
  hasSearch, 
  className = "" 
}: SearchStatsProps) {
  if (!hasSearch) return null;

  return (
    <div className={`text-sm text-muted-foreground ${className}`}>
      {totalResults === 0 ? (
        <span>لا توجد نتائج لـ "{searchQuery}"</span>
      ) : (
        <span>
          تم العثور على {totalResults} نتيجة لـ "{searchQuery}"
        </span>
      )}
    </div>
  );
}

/**
 * Search suggestions component (for future enhancement)
 */
interface SearchSuggestionsProps<T> {
  data: T[];
  searchQuery: string;
  searchKeys: string[];
  onSuggestionSelect: (suggestion: string) => void;
  maxSuggestions?: number;
  className?: string;
}

export function SearchSuggestions<T>({
  data,
  searchQuery,
  searchKeys,
  onSuggestionSelect,
  maxSuggestions = 5,
  className = ""
}: SearchSuggestionsProps<T>) {
  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const uniqueSuggestions = new Set<string>();
    
    data.forEach(item => {
      searchKeys.forEach(key => {
        const value = getNestedValue(item, key);
        if (typeof value === 'string' && 
            value.toLowerCase().includes(searchQuery.toLowerCase())) {
          uniqueSuggestions.add(value);
        }
      });
    });

    return Array.from(uniqueSuggestions).slice(0, maxSuggestions);
  }, [data, searchQuery, searchKeys, maxSuggestions]);

  if (suggestions.length === 0) return null;

  return (
    <div className={`absolute top-full left-0 right-0 z-50 bg-white border border-border rounded-md shadow-lg ${className}`}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          className="w-full text-right px-3 py-2 hover:bg-muted transition-colors text-sm"
          onClick={() => onSuggestionSelect(suggestion)}
        >
          <FuzzySearchHighlighter
            text={suggestion}
            searchWords={[searchQuery]}
            highlightClassName="bg-primary/20 text-primary"
          />
        </button>
      ))}
    </div>
  );
}

// Helper function for nested property access
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}
