'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Habilita soft delete (paranoid) no Document. Sem essa coluna, `document.destroy()`
    // roda um DELETE de verdade, que cascateia (FK CASCADE de document_versions.document_id)
    // até tentar apagar document_versions — e isso é barrado pela FK RESTRICT de
    // signatures.document_version_id sempre que já existe alguma assinatura registrada
    // (a evidência jurídica não pode sumir com um simples "excluir documento"). Com
    // paranoid, excluir só marca deleted_at e some das queries normais, sem tocar em
    // document_versions/signatures.
    await queryInterface.addColumn('documents', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('documents', 'deleted_at');
  },
};
