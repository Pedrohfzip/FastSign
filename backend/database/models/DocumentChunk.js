import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
    class DocumentChunk extends Model {
        static associate(models) {
            DocumentChunk.belongsTo(models.Document, {
                foreignKey: 'documentId',
                as: 'document',
            });
        }
    }

    DocumentChunk.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            documentId: {
                type: DataTypes.UUID,
                allowNull: false,
                field: 'document_id',
            },
            chunkIndex: {
                type: DataTypes.INTEGER,
                allowNull: false,
                field: 'chunk_index',
            },
            chunkText: {
                type: DataTypes.TEXT,
                allowNull: false,
                field: 'chunk_text',
            },
            embedding: {
                // A coluna real é `vector(768)` (pgvector, gerado pelo nomic-embed-text) — tipo
                // sem equivalente no Sequelize.DataTypes (ver migration create-document-chunks).
                // Mapeamos como STRING porque o node-pg não conhece o OID de `vector` e devolve o
                // valor cru como texto no formato `[0.1,0.2,...]`. O get/set abaixo esconde esse
                // detalhe: quem usa o model lê/escreve um array de números normal (igual ao array
                // que a API de embeddings do Ollama já devolve), nunca a string com colchetes —
                // se passássemos um array JS direto, o node-pg serializaria como array do Postgres
                // (`{1,2,3}`), que não é aceito pelo tipo `vector` (espera `[1,2,3]`).
                type: DataTypes.STRING,
                allowNull: true,
                get() {
                    const raw = this.getDataValue('embedding');
                    if (!raw) return null;
                    return raw
                        .slice(1, -1)
                        .split(',')
                        .map(Number);
                },
                set(value) {
                    if (value == null) {
                        this.setDataValue('embedding', null);
                        return;
                    }
                    this.setDataValue('embedding', `[${value.join(',')}]`);
                },
            },
        },
        {
            sequelize,
            modelName: 'DocumentChunk',
            tableName: 'document_chunks',
            underscored: true,
            timestamps: true,
        }
    );

    return DocumentChunk;
};
