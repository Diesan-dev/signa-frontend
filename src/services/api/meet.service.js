import { baseService } from '../base.service';

export const meetService = {
    getMeetbyUuid: async (uuid) => {
        return baseService.get('/meets/uuid/' + uuid);
    },
    getMeetById: async (id) => {
        return baseService.get('/meets/' + id);
    },
    createNewMeet: async (data) => {
        return baseService.post('/meets', data);
    },
    getFreeMeetsToday: async () => {
        return baseService.get('/meets/free-count-today');
    },
    deleteMeet: async (id) => {
        return baseService.delete('/meets/' + id);
    },
    endMeet: async (id, startTime) => {
        return baseService.patch('/meets/' + id + '/end', { startTime });
    },

    validateMeet: async (id) => {
        return baseService.get('/meets/' + id + '/validate');
    },
    addMessage: async (meetId, messageData) => {
        return baseService.post('/meets/' + meetId + '/messages', messageData);
    },
};