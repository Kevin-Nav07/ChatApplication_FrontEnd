/*This file is meant to provide a contract for the data shape 
 of our expected environment variables

*/

interface ImportMetaEnv {
    // optional: unset in production builds, where apiConfig.ts falls back to the same-origin "/api"
    readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}