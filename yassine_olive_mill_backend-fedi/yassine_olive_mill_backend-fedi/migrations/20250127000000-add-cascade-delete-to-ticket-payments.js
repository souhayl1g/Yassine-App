'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  up: async (queryInterface, Sequelize) => {
    // Remove the existing foreign key constraint
    try {
      await queryInterface.removeConstraint('ticket_payments', 'ticket_payments_ticketId_fkey');
    } catch (error) {
      console.log('Constraint may not exist or have different name, continuing...');
    }
    
    // Add the foreign key constraint with CASCADE delete
    await queryInterface.addConstraint('ticket_payments', {
      fields: ['ticketId'],
      type: 'foreign key',
      name: 'ticket_payments_ticketId_fkey',
      references: {
        table: 'batches',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop the CASCADE foreign key constraint
    await queryInterface.removeConstraint('ticket_payments', 'ticket_payments_ticketId_fkey');
    
    // Add back the original foreign key constraint without CASCADE
    await queryInterface.addConstraint('ticket_payments', {
      fields: ['ticketId'],
      type: 'foreign key',
      name: 'ticket_payments_ticketId_fkey',
      references: {
        table: 'batches',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
  }
};