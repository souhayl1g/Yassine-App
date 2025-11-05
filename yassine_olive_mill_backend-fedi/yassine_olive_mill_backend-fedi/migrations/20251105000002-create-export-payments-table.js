'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Create export_payments table
    await queryInterface.createTable('export_payments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      containerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'containers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 3),
        allowNull: false
      },
      payment_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      payment_method: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: 'cash'
      },
      payment_type: {
        type: Sequelize.ENUM('incoming'),
        allowNull: false,
        defaultValue: 'incoming',
        comment: 'always incoming: customer pays us for oil export'
      },
      buyer_name: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Name of the oil buyer'
      },
      buyer_contact: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Contact information of the oil buyer'
      },
      reference: {
        type: Sequelize.STRING,
        allowNull: true
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

    // Add indexes for export_payments
    await queryInterface.addIndex('export_payments', ['containerId']);
    await queryInterface.addIndex('export_payments', ['payment_date']);
    await queryInterface.addIndex('export_payments', ['buyer_name']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('export_payments');
  }
};
