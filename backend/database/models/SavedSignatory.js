import { Model } from 'sequelize';

// Contato salvo pelo DONO de documentos, pra reutilizar nome/e-mail na hora de
// adicionar signatários sem precisar redigitar — não tem nenhuma relação com
// `Signatory` (que é específico de um documento) nem exige que o contato seja um
// `User` cadastrado no sistema.
export default (sequelize, DataTypes) => {
    class SavedSignatory extends Model {
        static associate(models) {
            SavedSignatory.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'owner',
            });
        }
    }

    SavedSignatory.init(
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
            name: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
            email: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: 'SavedSignatory',
            tableName: 'saved_signatories',
            underscored: true,
            timestamps: true,
        }
    );

    return SavedSignatory;
};
