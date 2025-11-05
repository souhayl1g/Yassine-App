'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    let tableExists = false;
    try {
      await queryInterface.describeTable('owner_funds');
      tableExists = true;
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable('owner_funds', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          unique: true
        },
        startingFunds: {
          type: Sequelize.DECIMAL(10, 3),
          allowNull: false,
          defaultValue: 0
        },
        amountSpent: {
          type: Sequelize.DECIMAL(10, 3),
          allowNull: false,
          defaultValue: 0
        },
        balance: {
          type: Sequelize.DECIMAL(10, 3),
          allowNull: false,
          defaultValue: 0
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });

      await queryInterface.addIndex('owner_funds', ['date'], {
        unique: true,
        name: 'owner_funds_date_unique'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('owner_funds');
  }
};

