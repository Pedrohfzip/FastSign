'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('signatures', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      signatory_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
      },
      document_version_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      signature_image: { type: Sequelize.TEXT, allowNull: true },
      signature_type: {
        type: Sequelize.ENUM('DRAWN', 'TYPED', 'UPLOADED'),
        defaultValue: 'DRAWN',
        allowNull: false,
      },
      document_hash: { type: Sequelize.STRING(128), allowNull: false },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      user_agent: { type: Sequelize.STRING(512), allowNull: true },
      signed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addConstraint('signatures', {
      fields: ['signatory_id'],
      type: 'foreign key',
      name: 'fk_signatures_signatory',
      references: { table: 'signatories', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });

    await queryInterface.addConstraint('signatures', {
      fields: ['document_version_id'],
      type: 'foreign key',
      name: 'fk_signatures_document_version',
      references: { table: 'document_versions', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addIndex('signatures', ['document_version_id'], {
      name: 'idx_signatures_document_version_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('signatures', 'fk_signatures_signatory');
    await queryInterface.removeConstraint('signatures', 'fk_signatures_document_version');
    await queryInterface.dropTable('signatures');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_signatures_signature_type";');
  },
};