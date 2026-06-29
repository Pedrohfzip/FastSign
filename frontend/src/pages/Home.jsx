import React from 'react';
import Header from '../components/Header';
import DocumentCard from '../components/DocumentCard';
import { uploadDocument, getDocuments } from '../api/fileRoute';

const DocumentViewer = ({ documentId }) => (
    <iframe
        src={`http://localhost:3001/api/documents/${documentId}/file`}
        width="100%"
        height="100%"
        className="rounded-lg border-0"
    />
);

const Home = () => {
    const inputRef = React.useRef(null);
    const [uploading, setUploading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [error, setError] = React.useState(null);
    const [documents, setDocuments] = React.useState([]);
    const [selectedDocumentId, setSelectedDocumentId] = React.useState(null);

    const fetchDocuments = () => {
        getDocuments()
            .then(data => setDocuments(data))
            .catch(() => setError('Erro ao carregar documentos.'));
    };

    React.useEffect(() => {
        fetchDocuments();
    }, []);

    const handleNewDocument = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setError(null);
        setUploading(true);
        setUploadProgress(0);

        try {
            await uploadDocument(file, (percent) => setUploadProgress(percent));
            fetchDocuments();
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Erro ao enviar documento.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="flex h-[calc(100vh-57px)]">

                {/* Sidebar esquerda — lista */}
                <div className="w-80 min-w-[280px] bg-white border-r border-gray-200 flex flex-col">

                    {/* Header da sidebar */}
                    <div className="p-4 border-b border-gray-100">
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-sm font-semibold text-gray-900">Documentos recentes</h2>
                            <label className="bg-black hover:bg-gray-800 text-white text-xs font-semibold py-1.5 px-3 rounded cursor-pointer transition-colors">
                                + Novo
                                <input
                                    type="file"
                                    accept=".pdf"
                                    ref={inputRef}
                                    onChange={handleNewDocument}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {uploading && (
                            <div>
                                <div className="w-full bg-gray-200 rounded-full h-1">
                                    <div
                                        className="bg-black h-1 rounded-full transition-all"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Enviando... {uploadProgress}%</p>
                            </div>
                        )}

                        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                    </div>

                    {/* Lista de documentos */}
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                        {documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-xs text-gray-400">Nenhum documento ainda.<br />Clique em + Novo para enviar.</p>
                            </div>
                        ) : (
                            documents.map(doc => (
                                <DocumentCard
                                    key={doc.id}
                                    title={doc.title}
                                    status={doc.status}
                                    statusColor="orange"
                                    progress={0}
                                    pages={0}
                                    size="-"
                                    expiryDate="-"
                                    current={1}
                                    total={1}
                                    selected={selectedDocumentId === doc.id}
                                    onClick={() => setSelectedDocumentId(doc.id)}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Área principal — visualizador */}
                <div className="flex-1 p-6">
                    {selectedDocumentId ? (
                        <div className="h-full rounded-xl overflow-hidden shadow-sm border border-gray-200">
                            <DocumentViewer documentId={selectedDocumentId} />
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12">
                                <svg className="w-12 h-12 text-gray-300 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm font-medium text-gray-500">Selecione um documento para visualizar</p>
                                <p className="text-xs text-gray-400 mt-1">O PDF será exibido aqui</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Home;