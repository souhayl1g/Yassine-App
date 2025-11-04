import Fuse from 'fuse.js';

export interface FuzzySearchOptions {
  threshold?: number; // 0.0 requires a perfect match, 1.0 would match anything
  includeScore?: boolean;
  includeMatches?: boolean;
  minMatchCharLength?: number;
  shouldSort?: boolean;
  findAllMatches?: boolean;
  keys?: string[];
}

export interface FuzzySearchResult<T> {
  item: T;
  refIndex: number;
  score?: number;
  matches?: Array<{
    indices: Array<[number, number]>;
    value: string;
    key: string;
  }>;
}

/**
 * Creates a fuzzy search instance for the given data
 */
export function createFuzzySearch<T>(
  data: T[],
  options: FuzzySearchOptions = {}
): Fuse<T> {
  const defaultOptions: FuzzySearchOptions = {
    threshold: 0.4, // Allow some typos but not too loose
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2, // Minimum 2 characters to start searching
    shouldSort: true,
    findAllMatches: true,
    ...options
  };

  return new Fuse(data, defaultOptions);
}

/**
 * Performs fuzzy search on a dataset with enhanced name matching
 */
export function performFuzzySearch<T>(
  data: T[],
  query: string,
  keys: string[],
  options: FuzzySearchOptions = {}
): FuzzySearchResult<T>[] {
  if (!query || query.trim().length < 2) {
    return data.map((item, index) => ({ item, refIndex: index }));
  }

  // Create enhanced data with name variations for better matching
  const enhancedData = data.map(item => {
    const enhanced = { ...item } as any;
    keys.forEach(key => {
      const value = getNestedValue(item, key);
      if (typeof value === 'string') {
        // For clientName field, add additional searchable variations
        if (key === 'clientName') {
          const nameParts = value.trim().split(/\s+/).filter(part => part.length > 1);
          // Add individual name parts for better matching
          setNestedValue(enhanced, key + '_parts', nameParts.join(' '));
          // Add reversed name for flipped name matching
          if (nameParts.length >= 2) {
            setNestedValue(enhanced, key + '_reversed', nameParts.reverse().join(' '));
          }
          // Add all combinations for multi-part names
          if (nameParts.length > 2) {
            const combinations = [];
            for (let i = 0; i < nameParts.length; i++) {
              for (let j = i + 1; j < nameParts.length; j++) {
                combinations.push(`${nameParts[i]} ${nameParts[j]}`);
                combinations.push(`${nameParts[j]} ${nameParts[i]}`);
              }
            }
            setNestedValue(enhanced, key + '_combinations', combinations.join(' '));
          }
        }
      }
    });
    return enhanced;
  });

  // Create expanded search keys for better name matching
  const expandedKeys = [];
  keys.forEach(key => {
    expandedKeys.push(key);
    if (key === 'clientName') {
      expandedKeys.push(key + '_parts');
      expandedKeys.push(key + '_reversed');
      expandedKeys.push(key + '_combinations');
    }
  });

  const searchOptions = {
    ...options,
    keys: expandedKeys
  };

  const fuse = createFuzzySearch(enhancedData, searchOptions);
  const results = fuse.search(query.trim());

  // Map results back to original data
  return results.map(result => ({
    ...result,
    item: data[result.refIndex]
  })) as FuzzySearchResult<T>[];
}

/**
 * Highlights matching parts of text based on fuzzy search matches
 */
export function highlightMatches(
  text: string,
  matches?: Array<{ indices: Array<[number, number]> }>
): string {
  if (!matches || matches.length === 0) {
    return text;
  }

  let highlightedText = '';
  let lastIndex = 0;

  // Sort indices to process them in order
  const sortedIndices = matches
    .flatMap(match => match.indices)
    .sort((a, b) => a[0] - b[0]);

  for (const [start, end] of sortedIndices) {
    // Add text before the match
    highlightedText += text.slice(lastIndex, start);
    
    // Add highlighted match
    highlightedText += `<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">${text.slice(start, end + 1)}</mark>`;
    
    lastIndex = end + 1;
  }

  // Add remaining text
  highlightedText += text.slice(lastIndex);

  return highlightedText;
}

/**
 * Arabic-aware fuzzy search preprocessing
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  
  return text
    // Normalize Arabic characters
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ي]/g, 'ى')
    // Remove diacritics
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    // Normalize spaces
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Enhanced fuzzy search for Arabic text with name variation handling
 */
export function performArabicFuzzySearch<T>(
  data: T[],
  query: string,
  keys: string[],
  options: FuzzySearchOptions = {}
): FuzzySearchResult<T>[] {
  const normalizedQuery = normalizeArabicText(query);
  
  // Create a version of data with normalized Arabic text for searching
  const normalizedData = data.map(item => {
    const normalized = { ...item } as any;
    keys.forEach(key => {
      const value = getNestedValue(item, key);
      if (typeof value === 'string') {
        const normalizedValue = normalizeArabicText(value);
        setNestedValue(normalized, key + '_normalized', normalizedValue);
        
        // For clientName field, add additional searchable variations
        if (key === 'clientName') {
          const nameParts = normalizedValue.split(/\s+/).filter(part => part.length > 1);
          // Add individual name parts for better matching
          setNestedValue(normalized, key + '_parts', nameParts.join(' '));
          // Add reversed name for flipped name matching
          if (nameParts.length >= 2) {
            setNestedValue(normalized, key + '_reversed', nameParts.reverse().join(' '));
          }
          // Add all combinations for multi-part names
          if (nameParts.length > 2) {
            const combinations = [];
            for (let i = 0; i < nameParts.length; i++) {
              for (let j = i + 1; j < nameParts.length; j++) {
                combinations.push(`${nameParts[i]} ${nameParts[j]}`);
                combinations.push(`${nameParts[j]} ${nameParts[i]}`);
              }
            }
            setNestedValue(normalized, key + '_combinations', combinations.join(' '));
          }
        }
      }
    });
    return normalized;
  });

  // Create expanded search keys for better name matching
  const expandedKeys = [];
  keys.forEach(key => {
    expandedKeys.push(key + '_normalized');
    if (key === 'clientName') {
      expandedKeys.push(key + '_parts');
      expandedKeys.push(key + '_reversed');
      expandedKeys.push(key + '_combinations');
    }
  });
  
  const searchOptions = {
    threshold: 0.3, // More lenient for Arabic
    ...options,
    keys: expandedKeys
  };

  const fuse = createFuzzySearch(normalizedData, searchOptions);
  const results = fuse.search(normalizedQuery);

  // Map results back to original data
  return results.map(result => ({
    ...result,
    item: data[result.refIndex]
  })) as FuzzySearchResult<T>[];
}

// Helper functions for nested object property access
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
}
