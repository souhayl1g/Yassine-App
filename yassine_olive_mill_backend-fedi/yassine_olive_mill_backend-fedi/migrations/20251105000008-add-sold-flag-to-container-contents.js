'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('container_contents');
    if (!tableDescription.sold) {
      await queryInterface.addColumn('container_contents', 'sold', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Flag to indicate if this container content has been sold'
      });

      await queryInterface.addColumn('container_contents', 'sold_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when the container content was sold'
      });

      await queryInterface.addIndex('container_contents', ['sold'], {
        name: 'container_contents_sold_idx'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('container_contents', 'container_contents_sold_idx');
    await queryInterface.removeColumn('container_contents', 'sold_at');
    await queryInterface.removeColumn('container_contents', 'sold');
  }
};

