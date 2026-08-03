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
        },
        {
            sequelize,
            modelName: 'Document',
            tableName: 'documents',
            underscored: true,
            timestamps: true,
        }
    );

    return Document;
};