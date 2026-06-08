import React from 'react';
import Header from '../components/Header';
import DocumentCard from '../components/DocumentCard';
import { uploadFile } from '../api/fileRoute';
const Home = () => {
    const inputRef = React.useRef(null);
    const handleNewDocument = async () => {
        // Lógica para criar um novo documento (exemplo: abrir modal, redirecionar, etc.)
        // const result = await uploadFile(file);
        // console.log(result);
    };



    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-6 py-6">
                <div className="grid grid-cols-12 gap-6">

                    {/* Coluna esquerda — lista de documentos */}
                    <div className="col-span-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-gray-900">Documentos recentes</h2>
                            {/* <button onClick={handleNewDocument} className="bg-black hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded flex items-center gap-2">
                                + Novo documento
                            </button> */}
                            <input
                                type="file"
                                accept=".pdf"
                                ref={inputRef}
                                onChange={handleNewDocument}
                            />
                        </div>

                        {/* Cards de documento */}
                        <div className="flex flex-col gap-3">
                            <DocumentCard 
                                title="Contrato de Prestação de Serviços — TechCorp.pdf"
                                status="EM ANDAMENTO"
                                statusColor="orange"
                                progress={33}
                                pages={8}
                                size="1.2 MB"
                                expiryDate="2026-06-17"
                                current={1}
                                total={3}
                            />
                        </div>
                    </div>

                    {/* Coluna direita — detalhe */}
                    <div className="col-span-4">
                        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center h-48">
                            <svg className="w-10 h-10 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm text-gray-400">Selecione um documento para ver os detalhes</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Home;