import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
    class Signatory extends Model {
        static associate(models) {
            Signatory.belongsTo(models.Document, {
                foreignKey: 'documentId',
                as: 'document',
            });
            Signatory.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user',
            });
            Signatory.hasOne(models.Signature, {
                foreignKey: 'signatoryId',
                as: 'signature',
            });
        }
    }

    Signatory.init(
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
            userId: {
                type: DataTypes.UUID,
                allowNull: true,
                field: 'user_id',
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            status: {
                type: DataTypes.ENUM('PENDING', 'SIGNED', 'DECLINED'),
                defaultValue: 'PENDING',
            },
            accessToken: {
                type: DataTypes.STRING(128),
                allowNull: false,
                unique: true,
                field: 'access_token',
            },
            signedAt: {
                type: DataTypes.DATE,
                allowNull: true,
                field: 'signed_at',
            },
            declinedAt: {
                type: DataTypes.DATE,
                allowNull: true,
                field: 'declined_at',
            },
            declineReason: {
                type: DataTypes.TEXT,
                allowNull: true,
                field: 'decline_reason',
            },
            tokenExpiresAt: {
                type: DataTypes.DATE,
                allowNull: true,
                field: 'token_expires_at',
            },
        },
        {
            sequelize,
            modelName: 'Signatory',
            tableName: 'signatories',
            underscored: true,
            timestamps: true,
        }
    );

    return Signatory;
};