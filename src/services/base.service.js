import axios from 'axios';
import { env } from '../config/env';
import { setupInterceptors } from '../interceptors/auth.interceptor';

const api = setupInterceptors(axios.create({
    baseURL: env.API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
}));

export const baseService = {
    get: async (url, config = {}) => {
        const response = await api.get(url, config);
        return response.data;
    },
    
    post: async (url, data, config = {}) => {
        const response = await api.post(url, data, config);
        return response.data;
    },
    
    put: async (url, data, config = {}) => {
        const response = await api.put(url, data, config);
        return response.data;
    },

    patch: async (url, data, config = {}) => {
        const response = await api.patch(url, data, config);
        return response.data;
    },

    
    delete: async (url, config = {}) => {
        const response = await api.delete(url, config);
        return response.data;
    }
};