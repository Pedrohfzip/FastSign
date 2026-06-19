'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('documents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      user_id: { type: Sequelize.UUID, allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      original_name: { type: Sequelize.STRING(255), allowNull: false },
      mime_type: { type: Sequelize.STRING(100), allowNull: false },
      status: {
        type: Sequelize.ENUM('DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'),
        defaultValue: 'DRAFT',
        allowNull: false,
      },
      current_version_id: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.createTable('document_versions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      document_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'documents', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      version_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      file_path: {
        type: Sequelize.STRING(1024),
        allowNull: false,
      },
      file_size: { type: Sequelize.BIGINT, allowNull: false },
      checksum: { type: Sequelize.STRING(64), allowNull: true },
      page_count: { type: Sequelize.INTEGER, allowNull: true },
      uploaded_by: { type: Sequelize.UUID, allowNull: false },
      metadata: { type: Sequelize.JSONB, defaultValue: {} },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addConstraint('documents', {
      fields: ['current_version_id'],
      type: 'foreign key',
      name: 'fk_documents_current_version',
      references: { table: 'document_versions', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex('documents', ['user_id'], { name: 'idx_documents_user_id' });
    await queryInterface.addIndex('documents', ['status'], { name: 'idx_documents_status' });
    await queryInterface.addIndex('document_versions', ['document_id'], { name: 'idx_doc_versions_document_id' });
    await queryInterface.addIndex('document_versions', ['document_id', 'version_number'], {
      name: 'idx_doc_versions_doc_version',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('documents', 'fk_documents_current_version');
    await queryInterface.dropTable('document_versions');
    await queryInterface.dropTable('documents');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_documents_status";');
  },
};