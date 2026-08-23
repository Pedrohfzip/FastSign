'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Liga/desliga, por documento, a exigência de o signatário informar um documento de
    // identificação (CPF/RG/outro) na hora de assinar — decidido pelo dono ao adicionar
    // os signatários (ver AddSignatories.jsx). Default false preserva o comportamento
    // atual (só nome) pra todo documento já existente.
    await queryInterface.addColumn('documents', 'require_signatory_document', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('documents', 'require_signatory_document');
  },
};
