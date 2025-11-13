'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    let tableExists = false;
    try {
      await queryInterface.describeTable('payment_expenses');
      tableExists = true;
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable('payment_expenses', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        category: {
          type: Sequelize.ENUM('equipment', 'repair', 'supplies', 'utilities', 'maintenance', 'fuel', 'other'),
          allowNull: false,
          defaultValue: 'other'
        },
        item: {
          type: Sequelize.STRING,
          allowNull: false
        },
        amount: {
          type: Sequelize.DECIMAL(10, 3),
          allowNull: false
        },
        vendor: {
          type: Sequelize.STRING,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        receipt_reference: {
          type: Sequelize.STRING,
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

      await queryInterface.addIndex('payment_expenses', ['date'], {
        name: 'payment_expenses_date_idx'
      });

      await queryInterface.addIndex('payment_expenses', ['category'], {
        name: 'payment_expenses_category_idx'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('payment_expenses');
  }
};

