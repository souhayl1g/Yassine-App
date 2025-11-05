'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    // Create ticket_payments table
    await queryInterface.createTable('ticket_payments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      ticketId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'batches',
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
        type: Sequelize.ENUM('incoming', 'outgoing'),
        allowNull: false,
        comment: 'incoming: customer pays us (pressing), outgoing: we pay customer (sale)'
      },
      operation_type: {
        type: Sequelize.ENUM('sale', 'pressing'),
        allowNull: false
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

    // Add indexes for ticket_payments
    await queryInterface.addIndex('ticket_payments', ['ticketId']);
    await queryInterface.addIndex('ticket_payments', ['payment_date']);
    await queryInterface.addIndex('ticket_payments', ['payment_type']);
    await queryInterface.addIndex('ticket_payments', ['operation_type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ticket_payments');
  }
};
