import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
    class User extends Model {
        static associate(models) {
            User.hasMany(models.Document, {
                foreignKey: 'userId',
                as: 'documents',
            });
            User.hasMany(models.Signatory, {
                foreignKey: 'userId',
                as: 'signatories',
            });
        }
    }

    User.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
                unique: true,
            },
            cpf: {
                type: DataTypes.STRING(11),
                allowNull: false,
                unique: true,
            },
            passwordHash: {
                type: DataTypes.STRING(255),
                allowNull: false,
                field: 'password_hash',
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                field: 'is_active',
            },
        },
        {
            sequelize,
            modelName: 'User',
            tableName: 'users',
            underscored: true,
            timestamps: true,
        }
    );

    return User;
};