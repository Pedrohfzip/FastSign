import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
    class DocumentVersion extends Model {
        static associate(models) {
            DocumentVersion.belongsTo(models.Document, {
                foreignKey: 'documentId',
                as: 'document',
            });
        }
    }

    DocumentVersion.init(
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
            versionNumber: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
                field: 'version_number',
            },
            s3Key: {
                type: DataTypes.STRING(512),
                allowNull: false,
                field: 's3_key',
            },
            s3Bucket: {
                type: DataTypes.STRING(255),
                allowNull: false,
                field: 's3_bucket',
            },
            s3Url: {
                type: DataTypes.TEXT,
                allowNull: true,
                field: 's3_url',
            },
            fileSize: {
                type: DataTypes.BIGINT,
                allowNull: false,
                field: 'file_size',
            },
            checksum: {
                type: DataTypes.STRING(64),
                allowNull: true,
            },
            pageCount: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: 'page_count',
            },
            uploadedBy: {
                type: DataTypes.UUID,
                allowNull: false,
                field: 'uploaded_by',
            },
            metadata: {
                type: DataTypes.JSONB,
                defaultValue: {},
            },
        },
        {
            sequelize,
            modelName: 'DocumentVersion',
            tableName: 'document_versions',
            underscored: true,
            timestamps: true,
        }
    );

    return DocumentVersion;
};