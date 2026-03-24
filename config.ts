let apiUrl = import.meta.env.VITE_API_URL;

// Ensure apiUrl is a string and handle common pitfalls
if (apiUrl === undefined || apiUrl === null || apiUrl === 'undefined' || apiUrl === 'null' || apiUrl === '/') {
    apiUrl = '';
}

// Ensure it doesn't end with a slash if it's not empty
if (apiUrl && apiUrl.endsWith('/')) {
    apiUrl = apiUrl.slice(0, -1);
}

// Prevent using localhost in production
if (import.meta.env.PROD && apiUrl.includes('localhost')) {
    apiUrl = '';
}

export const API_BASE_URL = apiUrl;

// Debug info for troubleshooting connection issues
if (typeof window !== 'undefined') {
    (window as any).API_DEBUG = {
        API_BASE_URL,
        origin: window.location.origin,
        fullUrl: `${API_BASE_URL}/api/auth/login`,
        env: import.meta.env.MODE
    };
    console.log('ONT Finder Pro - API Configuration:', (window as any).API_DEBUG);
}
