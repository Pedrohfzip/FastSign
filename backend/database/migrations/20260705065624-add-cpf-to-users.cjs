'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'cpf', {
      type: Sequelize.STRING(11),
      allowNull: false,
      unique: true,
    });

    await queryInterface.addIndex('users', ['cpf'], { name: 'idx_users_cpf', unique: true });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'idx_users_cpf');
    await queryInterface.removeColumn('users', 'cpf');
  },
};