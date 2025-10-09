'use strict';

import { DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('batches', 'bidons_brought', {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of bidons brought by client (entered in scanner user page)'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('batches', 'bidons_brought');
  }
};
