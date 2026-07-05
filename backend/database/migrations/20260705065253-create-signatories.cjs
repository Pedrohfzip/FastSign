'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('signatories', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      document_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false },
      status: {
        type: Sequelize.ENUM('PENDING', 'SIGNED', 'DECLINED'),
        defaultValue: 'PENDING',
        allowNull: false,
      },
      access_token: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true,
      },
      signed_at: { type: Sequelize.DATE, allowNull: true },
      declined_at: { type: Sequelize.DATE, allowNull: true },
      decline_reason: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addConstraint('signatories', {
      fields: ['document_id'],
      type: 'foreign key',
      name: 'fk_signatories_document',
      references: { table: 'documents', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('signatories', {
      fields: ['user_id'],
      type: 'foreign key',
      name: 'fk_signatories_user',
      references: { table: 'users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('signatories', ['document_id'], { name: 'idx_signatories_document_id' });
    await queryInterface.addIndex('signatories', ['email'], { name: 'idx_signatories_email' });
    await queryInterface.addIndex('signatories', ['status'], { name: 'idx_signatories_status' });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('signatories', 'fk_signatories_document');
    await queryInterface.removeConstraint('signatories', 'fk_signatories_user');
    await queryInterface.dropTable('signatories');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_signatories_status";');
  },
};