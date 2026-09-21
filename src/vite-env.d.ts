/*This file is meant to provide a contract for the data shape 
 of our expected environment variables

*/

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}