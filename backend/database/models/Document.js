import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
    class Document extends Model {
        static associate(models) {
            Document.hasMany(models.DocumentVersion, {
                foreignKey: 'documentId',
                as: 'versions',
            });
            Document.belongsTo(models.DocumentVersion, {
                foreignKey: 'currentVersionId',
                as: 'currentVersion',
            });
            Document.hasMany(models.Signatory, {
                foreignKey: 'documentId',
                as: 'signatories',
            });
            Document.hasMany(models.DocumentChunk, {
                foreignKey: 'documentId',
                as: 'chunks',
            });
            Document.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'owner',
            }); // ⬅️ novo
        }
    }

    Document.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false,
                field: 'user_id',
            },
            title: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            originalName: {
                type: DataTypes.STRING(255),
                allowNull: false,
                field: 'original_name',
            },
            mimeType: {
                type: DataTypes.STRING(100),
                allowNull: false,
                field: 'mime_type',
            },
            status: {
                type: DataTypes.ENUM('DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
                defaultValue: 'DRAFT',
            },
            currentVersionId: {
                type: DataTypes.UUID,
                allowNull: true,
                field: 'current_version_id',
            },
            aiSummary: {
                // ⬅️ novo
                type: DataTypes.TEXT,
                allowNull: true,
                field: 'ai_summary',
            },
            suggestedPage: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: 'suggested_page',
            },
            suggestedX: {
                type: DataTypes.FLOAT,
                allowNull: true,
                field: 'suggested_x',
            },
            suggestedY: {
                type: DataTypes.FLOAT,
                allowNull: true,
                field: 'suggested_y',
            },
            contentPageCount: {
                // Páginas do documento "real" (original + carimbos), sem contar a(s)
                // página(s) de certificado de assinatura anexadas ao final — ver
                // PdfStampService.appendSignatureCertificate. Fica null até a primeira
                // assinatura, quando é fixado pra sempre.
                type: DataTypes.INTEGER,
                allowNull: true,
                field: 'content_page_count',
            },
            requireSignatoryDocument: {
                // Decidido pelo dono ao adicionar os signatários (AddSignatories.jsx). Quando
                // true, a tela de assinar (SignScreen.jsx/PublicSign.jsx) exige CPF/RG/outro
                // documento do signatário além do nome — ver Signature.signatoryDocumentType/
                // signatoryDocumentNumber, que é onde esse dado fica guardado como evidência.
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                field: 'require_signatory_document',
            },
        },
        {
            sequelize,
            modelName: 'Document',
            tableName: 'documents',
            underscored: true,
            timestamps: true,
            // Soft delete: `.destroy()` só marca `deletedAt` (coluna `deleted_at`) em vez de
            // apagar a linha de verdade, e o Sequelize passa a excluir automaticamente
            // documentos com `deletedAt` preenchido de todo `find`/`findAll` (sem precisar
            // filtrar isso manualmente nos services). Necessário pra excluir um documento sem
            // esbarrar na FK RESTRICT de signatures.document_version_id quando ele já tem
            // alguma assinatura — ver migration `add-deleted-at-to-documents`.
            paranoid: true,
        }
    );

    return Document;
};