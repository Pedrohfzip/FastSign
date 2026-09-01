'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Garante que a extensão existe antes de criar a coluna do tipo vector
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS vector;');

    await queryInterface.createTable('document_chunks', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      document_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'documents', key: 'id' },
        onDelete: 'CASCADE',
      },
      chunk_index: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      chunk_text: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      // nomic-embed-text gera vetores de 768 dimensões
      embedding: {
        type: 'vector(768)', // tipo especial do pgvector, sem equivalente direto no Sequelize.DataTypes
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('document_chunks', ['document_id'], {
      name: 'idx_document_chunks_document_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('document_chunks');
  },
};