'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Expiração do link de assinatura (/assinar/:accessToken e /sign/:accessToken).
    // Nullable: signatórios já existentes (criados antes desta migration) ficam sem
    // expiração — não faz sentido invalidar retroativamente um link já enviado sem
    // essa regra. A partir de agora, addSignatoriesToDocument sempre preenche esse
    // campo na criação (ver SIGNATORY_TOKEN_TTL_DAYS em SignatoryService.js).
    await queryInterface.addColumn('signatories', 'token_expires_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('signatories', 'token_expires_at');
  },
};
