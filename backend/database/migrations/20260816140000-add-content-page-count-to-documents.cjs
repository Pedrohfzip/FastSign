'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Guarda quantas páginas do PDF são "conteúdo real" (o documento original + carimbos
    // de assinatura), sem contar as páginas de certificado de assinatura que o sistema
    // anexa ao final a cada nova assinatura. Sem isso não dá pra saber onde cortar o PDF
    // antes de regenerar o certificado atualizado a cada nova assinatura.
    await queryInterface.addColumn('documents', 'content_page_count', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('documents', 'content_page_count');
  },
};
