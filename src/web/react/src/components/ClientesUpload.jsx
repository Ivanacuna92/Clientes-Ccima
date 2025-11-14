import { useState, useEffect } from 'react';
import { Upload, File, CheckCircle, XCircle, Trash2, Download, FileSpreadsheet } from 'lucide-react';
import * as api from '../services/api';

function ClientesUpload() {
  const [uploading, setUploading] = useState(false);
  const [currentCSVFile, setCurrentCSVFile] = useState(null);
  const [currentXLSXFile, setCurrentXLSXFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  useEffect(() => {
    fetchCurrentFiles();
  }, []);

  const fetchCurrentFiles = async () => {
    try {
      // Obtener archivos CSV
      const csvResponse = await api.getUploadedCSVs();
      const csvFiles = csvResponse.files || [];
      setCurrentCSVFile(csvFiles[0] || null);

      // Obtener archivos XLSX
      const xlsxResponse = await api.getUploadedXLSXs();
      const xlsxFiles = xlsxResponse.files || [];
      setCurrentXLSXFile(xlsxFiles[0] || null);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    // Determinar el tipo de archivo
    const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
    const isXLSX = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx');

    if (!isCSV && !isXLSX) {
      setUploadStatus({ type: 'error', message: 'Por favor selecciona un archivo CSV o XLSX' });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();

    try {
      let response;
      if (isCSV) {
        formData.append('csv', file);
        response = await api.uploadCSV(formData);
        setUploadStatus({
          type: 'success',
          message: `Archivo CSV cargado exitosamente. ${response.rowsProcessed} registros procesados. El archivo anterior fue reemplazado.`
        });
      } else {
        formData.append('xlsx', file);
        response = await api.uploadXLSX(formData);
        setUploadStatus({
          type: 'success',
          message: `Archivo XLSX cargado exitosamente. ${response.rowsProcessed} registros procesados. El archivo anterior fue reemplazado.`
        });
      }

      fetchCurrentFiles();
    } catch (error) {
      console.error('Error completo:', error);
      let errorMessage = 'Error al cargar el archivo';

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setUploadStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteCSV = async (filename) => {
    if (!confirm(`¿Estás seguro de eliminar ${filename}?`)) return;

    try {
      await api.deleteCSV(filename);
      setUploadStatus({
        type: 'success',
        message: `Archivo ${filename} eliminado exitosamente`
      });
      fetchCurrentFiles();
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Error al eliminar el archivo'
      });
    }
  };

  const handleDeleteXLSX = async (filename) => {
    if (!confirm(`¿Estás seguro de eliminar ${filename}?`)) return;

    try {
      await api.deleteXLSX(filename);
      setUploadStatus({
        type: 'success',
        message: `Archivo ${filename} eliminado exitosamente`
      });
      fetchCurrentFiles();
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Error al eliminar el archivo'
      });
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Gestión de Datos de Clientes</h2>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-navetec-primary bg-blue-50' : 'border-gray-300'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />

        <p className="text-lg mb-2">
          Arrastra y suelta tu archivo CSV o XLSX aquí
        </p>
        <p className="text-sm text-gray-500 mb-4">
          o
        </p>

        <label className="inline-block">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={handleFileInput}
            className="hidden"
            disabled={uploading}
          />
          <span className="px-4 py-2 bg-navetec-primary text-white rounded hover:bg-navetec-dark cursor-pointer inline-block">
            Seleccionar archivo CSV o XLSX
          </span>
        </label>

        <p className="text-xs text-gray-500 mt-4">
          Campos principales: LLAVE, LOTE, CONDOMINIO, CLIENTE, RFC, TELEFONO, CORREO, M2, TOTAL_OPERACION, ENGANCHE, PAGADO, DEUDA, ESTATUS_CM, etc.
        </p>

        <div className="mt-4 flex gap-3 justify-center flex-wrap">
          <a
            href="/api/csv/template"
            download="plantilla_clientes.csv"
            className="inline-flex items-center px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar plantilla CSV
          </a>
          <a
            href="/api/xlsx/template"
            download="plantilla_clientes.xlsx"
            className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Descargar plantilla XLSX
          </a>
        </div>
      </div>

      {uploadStatus && (
        <div className={`mt-4 p-4 rounded ${
          uploadStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          <div className="flex items-start">
            {uploadStatus.type === 'success' ?
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" /> :
              <XCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1">
              <pre className="whitespace-pre-wrap font-sans text-sm">{uploadStatus.message}</pre>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navetec-primary"></div>
          <span className="ml-2">Procesando archivo...</span>
        </div>
      )}

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        {/* Archivo CSV */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <File className="h-5 w-5 mr-2 text-green-600" />
            Archivo CSV Actual
          </h3>

          {!currentCSVFile ? (
            <p className="text-gray-500">No hay archivo CSV cargado</p>
          ) : (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0">
                  <File className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{currentCSVFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {currentCSVFile.records} registros • {new Date(currentCSVFile.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCSV(currentCSVFile.name)}
                  className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                  title="Eliminar archivo"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Nota: Subir un nuevo CSV reemplazará este automáticamente
              </p>
            </div>
          )}
        </div>

        {/* Archivo XLSX */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FileSpreadsheet className="h-5 w-5 mr-2 text-blue-600" />
            Archivo XLSX Actual
          </h3>

          {!currentXLSXFile ? (
            <p className="text-gray-500">No hay archivo XLSX cargado</p>
          ) : (
            <div className="p-3 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center flex-1 min-w-0">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{currentXLSXFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {currentXLSXFile.records} registros • {new Date(currentXLSXFile.uploadDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteXLSX(currentXLSXFile.name)}
                  className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                  title="Eliminar archivo"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Nota: Subir un nuevo XLSX reemplazará este automáticamente
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Nota importante:</strong> El bot utilizará la información de AMBOS archivos (CSV y XLSX) cuando responda a los clientes.
          Puedes tener ambos formatos cargados simultáneamente y el bot combinará toda la información disponible.
        </p>
      </div>
    </div>
  );
}

export default ClientesUpload;
