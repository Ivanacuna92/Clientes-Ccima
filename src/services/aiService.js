const axios = require('axios');
const config = require('../config/config');
const csvService = require('./csvService');
const xlsxService = require('./xlsxService');

class AIService {
    constructor() {
        this.apiKey = config.deepseekApiKey;
        this.apiUrl = config.deepseekApiUrl;
    }

    async generateResponse(messages) {
        try {
            // Incluir datos de CSV y XLSX en el prompt del sistema
            const enrichedMessages = await this.addDataToSystemPrompt(messages);

            const response = await axios.post(this.apiUrl, {
                model: 'deepseek-chat',
                messages: enrichedMessages,
                max_tokens: 1000,
                temperature: 0.5
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('Error con DeepSeek API:', error.response?.data || error.message);

            if (error.response?.data?.error?.type === 'authentication_error') {
                throw new Error('Error de autenticación con API key');
            }

            throw new Error('Error generando respuesta de IA');
        }
    }

    async addDataToSystemPrompt(messages) {
        try {
            // Obtener datos de CSV y XLSX
            const csvRecords = await csvService.getAllRecords();
            const xlsxRecords = await xlsxService.getAllRecords();

            // Combinar todos los registros
            const allRecords = [...csvRecords, ...xlsxRecords];

            if (allRecords.length === 0) {
                return messages;
            }

            // Formatear todos los registros (usar el formato de cualquiera de los servicios)
            const formattedData = allRecords.map(record =>
                csvService.formatRecordForDisplay(record)
            ).join('\n\n---\n\n');

            // Agregar datos al mensaje del sistema
            const enrichedMessages = [...messages];
            const systemMessage = enrichedMessages.find(m => m.role === 'system');

            if (systemMessage) {
                systemMessage.content = systemMessage.content + `\n\n*BASE DE DATOS DE CLIENTES (${allRecords.length} registros):*\n\n${formattedData}\n\nUsa esta información cuando el usuario pregunte sobre clientes, lotes, desarrollos, estatus de pagos, deudas, información de contacto o cualquier tema relacionado. Si el usuario pregunta por algo específico que está en esta base de datos, úsala para responder de manera precisa y actualizada.`;
            }

            return enrichedMessages;
        } catch (error) {
            console.error('Error agregando datos al prompt:', error);
            return messages;
        }
    }
}

module.exports = new AIService();