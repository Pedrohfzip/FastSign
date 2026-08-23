'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Evidência extra opcional, gravada junto com a assinatura (mesmo espírito de
    // document_hash/ip_address/user_agent, que já existiam): o número do documento de
    // identificação que o signatário informou, quando o dono exigiu isso pro documento
    // (ver documents.require_signatory_document). Nula quando não exigido.
    await queryInterface.addColumn('signatures', 'signatory_document_type', {
      type: Sequelize.ENUM('CPF', 'RG', 'OUTRO'),
      allowNull: true,
    });

    await queryInterface.addColumn('signatures', 'signatory_document_number', {
      type: Sequelize.STRING(32),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('signatures', 'signatory_document_number');
    await queryInterface.removeColumn('signatures', 'signatory_document_type');
    // Postgres não apaga o tipo ENUM sozinho ao remover a coluna que o usava.
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_signatures_signatory_document_type";');
  },
};
