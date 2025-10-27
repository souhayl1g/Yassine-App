'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  up: async (queryInterface, Sequelize) => {
    // Check if column already exists before adding
    const tableDescription = await queryInterface.describeTable('batches');
    if (!tableDescription.bidons_brought) {
      await queryInterface.addColumn('batches', 'bidons_brought', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of bidons brought by client (entered in scanner user page)'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('batches', 'bidons_brought');
  }
};
