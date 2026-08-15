'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('documents', 'suggested_page', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn('documents', 'suggested_x', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn('documents', 'suggested_y', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('documents', 'suggested_page');
    await queryInterface.removeColumn('documents', 'suggested_x');
    await queryInterface.removeColumn('documents', 'suggested_y');
  },
};
