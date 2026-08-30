'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saved_signatories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addConstraint('saved_signatories', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_saved_signatories_user',
      references: { table: 'users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    // Impede duplicar o mesmo contato (por e-mail, já normalizado em minúsculas pelo
    // service antes de salvar) pro mesmo dono — complementa o upsert feito em
    // SavedSignatoryService.upsertSavedSignatory.
    await queryInterface.addIndex('saved_signatories', ['user_id', 'email'], {
      name: 'idx_saved_signatories_user_email',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('saved_signatories', 'fk_saved_signatories_user');
    await queryInterface.dropTable('saved_signatories');
  },
};
