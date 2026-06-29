import React from 'react';

const DocumentCard = ({
    title, status, statusColor, progress, pages, size, expiryDate, current, total,
    onClick, selected
}) => {
    return (
        <div
            onClick={onClick}
            className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${selected ? 'border-black shadow-md' : 'border-gray-200 hover:border-gray-400'
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-800">{title}</span>
                <span className={`text-xs font-semibold ${statusColor === 'orange' ? 'text-orange-600 bg-orange-50' : 'text-green-600 bg-green-50'} px-2 py-1 rounded`}>
                    {status}
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1 mb-2">
                <div className="bg-green-500 h-1 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-xs text-gray-400">{pages} pág · {size} · expira {expiryDate} · {current}/{total}</p>
        </div>
    );
};

export default DocumentCard;
