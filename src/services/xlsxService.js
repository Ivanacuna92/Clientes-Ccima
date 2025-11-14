const fs = require('fs').promises;
const path = require('path');
const xlsx = require('xlsx');

class XLSXService {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'clientes');
    this.ensureDataDir();

    // Campos clave recomendados (pero no obligatorios todos)
    // El sistema es flexible y acepta cualquier estructura
    this.recommendedFields = [
      'LLAVE', 'LOTE', 'CONDOMINIO', 'CLUSTER', 'DESARROLLO', 'CLIENTE',
      'RFC', 'IDCIF', 'USO_CFDI', 'TELEFONO', 'CORREO', 'M2',
      'TOTAL_OPERACION', 'ENGANCHE', 'FINANCIAMIENTO', 'FIRMA_CONTRATO',
      'FIRMA_CONVENIO', 'FIN_CORRIDA', 'TOTAL_MENSUALIDADES',
      'PAGADO', 'DEUDA', 'ESTATUS_CM', 'TIPO_LOTE', 'ESTATUS'
    ];
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creando directorio de datos:', error);
    }
  }

  async saveXLSX(filename, buffer) {
    try {
      // Leer el archivo XLSX desde el buffer
      const workbook = xlsx.read(buffer, { type: 'buffer' });

      // Obtener la primera hoja
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('El archivo XLSX no contiene hojas');
      }

      const sheet = workbook.Sheets[sheetName];

      // Convertir a JSON
      const records = xlsx.utils.sheet_to_json(sheet, {
        raw: false, // Convertir todo a strings
        defval: '' // Valor por defecto para celdas vacías
      });

      // Validar que tenga registros
      if (records.length === 0) {
        throw new Error('El archivo XLSX está vacío o no tiene datos válidos');
      }

      // Validación flexible: solo verificar que tenga al menos una columna
      const xlsxFields = Object.keys(records[0]);
      if (xlsxFields.length === 0) {
        throw new Error('El archivo no tiene columnas válidas');
      }

      // ELIMINAR TODOS LOS ARCHIVOS XLSX EXISTENTES
      const existingFiles = await fs.readdir(this.dataDir);
      for (const file of existingFiles) {
        if (file.endsWith('.xlsx')) {
          await fs.unlink(path.join(this.dataDir, file));
          console.log(`Archivo anterior eliminado: ${file}`);
        }
      }

      // Guardar el nuevo archivo con timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const newFilename = `clientes_${timestamp}.xlsx`;
      const filePath = path.join(this.dataDir, newFilename);
      await fs.writeFile(filePath, buffer);

      return {
        success: true,
        filename: newFilename,
        rowsProcessed: records.length,
        records
      };
    } catch (error) {
      console.error('Error guardando XLSX:', error);
      throw new Error(error.message);
    }
  }

  async getAllRecords() {
    try {
      const files = await this.listXLSXFiles();
      let allRecords = [];

      for (const file of files) {
        const filePath = path.join(this.dataDir, file.name);
        const buffer = await fs.readFile(filePath);

        try {
          const workbook = xlsx.read(buffer, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const records = xlsx.utils.sheet_to_json(sheet, {
            raw: false,
            defval: ''
          });

          allRecords = allRecords.concat(records);
        } catch (parseError) {
          console.error(`Error parseando archivo ${file.name}:`, parseError);
        }
      }

      return allRecords;
    } catch (error) {
      console.error('Error obteniendo todos los registros XLSX:', error);
      return [];
    }
  }

  async searchInXLSX(query) {
    try {
      const records = await this.getAllRecords();

      // Normalizar la consulta
      const normalizedQuery = query.toLowerCase().trim();

      // Buscar en todos los campos
      const results = records.filter(record => {
        return Object.values(record).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(normalizedQuery);
        });
      });

      // Si hay resultados exactos por parque industrial, priorizar esos
      const exactMatches = results.filter(r =>
        r['Parque Industrial'] &&
        r['Parque Industrial'].toLowerCase() === normalizedQuery
      );

      if (exactMatches.length > 0) {
        return exactMatches;
      }

      return results;
    } catch (error) {
      console.error('Error buscando en XLSX:', error);
      return [];
    }
  }

  async searchByField(fieldName, value) {
    try {
      const records = await this.getAllRecords();
      const normalizedValue = value.toLowerCase().trim();

      return records.filter(record => {
        const fieldValue = record[fieldName];
        if (!fieldValue) return false;
        return String(fieldValue).toLowerCase().includes(normalizedValue);
      });
    } catch (error) {
      console.error('Error buscando por campo en XLSX:', error);
      return [];
    }
  }

  async listXLSXFiles() {
    try {
      const files = await fs.readdir(this.dataDir);
      const xlsxFiles = files.filter(f => f.endsWith('.xlsx'));

      const fileDetails = await Promise.all(
        xlsxFiles.map(async (filename) => {
          const filePath = path.join(this.dataDir, filename);
          const stats = await fs.stat(filePath);

          // Contar registros
          let records = 0;
          try {
            const buffer = await fs.readFile(filePath);
            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet);
            records = data.length;
          } catch (e) {
            console.error(`Error contando registros en ${filename}:`, e);
          }

          return {
            name: filename,
            uploadDate: stats.mtime,
            size: stats.size,
            records
          };
        })
      );

      return fileDetails.sort((a, b) => b.uploadDate - a.uploadDate);
    } catch (error) {
      console.error('Error listando archivos XLSX:', error);
      return [];
    }
  }

  async deleteXLSX(filename) {
    try {
      const filePath = path.join(this.dataDir, filename);
      await fs.unlink(filePath);
      return { success: true, message: `Archivo ${filename} eliminado` };
    } catch (error) {
      console.error('Error eliminando XLSX:', error);
      throw new Error('Error eliminando archivo: ' + error.message);
    }
  }

  formatRecordForDisplay(record) {
    let formatted = [];

    // Información principal del cliente
    if (record['LLAVE']) {
      formatted.push(`🔑 Llave: ${record['LLAVE']}`);
    }
    if (record['CLIENTE']) {
      formatted.push(`👤 Cliente: ${record['CLIENTE']}`);
    }
    if (record['RFC']) {
      formatted.push(`📄 RFC: ${record['RFC']}`);
    }

    // Información del lote/propiedad
    if (record['LOTE']) {
      formatted.push(`🏠 Lote: ${record['LOTE']}`);
    }
    if (record['CONDOMINIO']) {
      formatted.push(`🏘️ Condominio: ${record['CONDOMINIO']}`);
    }
    if (record['DESARROLLO']) {
      formatted.push(`🏗️ Desarrollo: ${record['DESARROLLO']}`);
    }
    if (record['M2']) {
      formatted.push(`📐 M²: ${record['M2']}`);
    }
    if (record['TIPO_LOTE']) {
      formatted.push(`🏷️ Tipo de Lote: ${record['TIPO_LOTE']}`);
    }

    // Información de contacto
    if (record['TELEFONO']) {
      formatted.push(`📞 Teléfono: ${record['TELEFONO']}`);
    }
    if (record['CORREO']) {
      formatted.push(`📧 Correo: ${record['CORREO']}`);
    }

    // Información financiera
    if (record['TOTAL_OPERACION']) {
      const total = parseFloat(String(record['TOTAL_OPERACION']).replace(/,/g, ''));
      if (!isNaN(total)) {
        formatted.push(`💰 Total Operación: ${total.toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}`);
      }
    }
    if (record['ENGANCHE']) {
      const enganche = parseFloat(String(record['ENGANCHE']).replace(/,/g, ''));
      if (!isNaN(enganche)) {
        formatted.push(`💵 Enganche: ${enganche.toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}`);
      }
    }
    if (record['PAGADO']) {
      const pagado = parseFloat(String(record['PAGADO']).replace(/,/g, ''));
      if (!isNaN(pagado)) {
        formatted.push(`✅ Pagado: ${pagado.toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}`);
      }
    }
    if (record['DEUDA']) {
      const deuda = parseFloat(String(record['DEUDA']).replace(/,/g, ''));
      if (!isNaN(deuda)) {
        formatted.push(`⚠️ Deuda: ${deuda.toLocaleString('es-MX', {style: 'currency', currency: 'MXN'})}`);
      }
    }
    if (record['TOTAL_MENSUALIDADES']) {
      formatted.push(`📅 Total Mensualidades: ${record['TOTAL_MENSUALIDADES']}`);
    }

    // Estatus
    if (record['ESTATUS_CM']) {
      const emoji = record['ESTATUS_CM'] === 'VENDIDO' ? '✅' : '⏳';
      formatted.push(`${emoji} Estatus: ${record['ESTATUS_CM']}`);
    }
    if (record['ESTATUS']) {
      formatted.push(`📊 Estado: ${record['ESTATUS']}`);
    }

    return formatted.join('\n');
  }
}

module.exports = new XLSXService();
