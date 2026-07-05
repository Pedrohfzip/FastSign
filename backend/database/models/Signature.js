import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
    class Signature extends Model {
        static associate(models) {
            Signature.belongsTo(models.Signatory, {
                foreignKey: 'signatoryId',
                as: 'signatory',
            });
            Signature.belongsTo(models.DocumentVersion, {
                foreignKey: 'documentVersionId',
                as: 'documentVersion',
            });
        }
    }

    Signature.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            signatoryId: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: true,
                field: 'signatory_id',
            },
            documentVersionId: {
                type: DataTypes.UUID,
                allowNull: false,
                field: 'document_version_id',
            },
            signatureImage: {
                type: DataTypes.TEXT,
                allowNull: true,
                field: 'signature_image',
            },
            signatureType: {
                type: DataTypes.ENUM('DRAWN', 'TYPED', 'UPLOADED'),
                allowNull: false,
                defaultValue: 'DRAWN',
                field: 'signature_type',
            },
            documentHash: {
                type: DataTypes.STRING(128),
                allowNull: false,
                field: 'document_hash',
            },
            ipAddress: {
                type: DataTypes.STRING(45),
                allowNull: true,
                field: 'ip_address',
            },
            userAgent: {
                type: DataTypes.STRING(512),
                allowNull: true,
                field: 'user_agent',
            },
            signedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                field: 'signed_at',
            },
        },
        {
            sequelize,
            modelName: 'Signature',
            tableName: 'signatures',
            underscored: true,
            timestamps: true,
        }
    );

    return Signature;
};