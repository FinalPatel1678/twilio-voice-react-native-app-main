import { getEnvVariable } from './env';
export const fetch = globalThis.fetch;
export const defaultUrl = getEnvVariable('DEFAULT_URL');
export const secreteApiKey = getEnvVariable('SECRET_API_KEY');
