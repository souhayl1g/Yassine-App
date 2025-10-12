'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the existing foreign key constraint
    await queryInterface.removeConstraint('pressing_queue', 'pressing_queue_batch_id_fkey');
    
    // Add the foreign key constraint with CASCADE delete
    await queryInterface.addConstraint('pressing_queue', {
      fields: ['batch_id'],
      type: 'foreign key',
      name: 'pressing_queue_batch_id_fkey',
      references: {
        table: 'batches',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop the CASCADE foreign key constraint
    await queryInterface.removeConstraint('pressing_queue', 'pressing_queue_batch_id_fkey');
    
    // Add back the original foreign key constraint without CASCADE
    await queryInterface.addConstraint('pressing_queue', {
      fields: ['batch_id'],
      type: 'foreign key',
      name: 'pressing_queue_batch_id_fkey',
      references: {
        table: 'batches',
        field: 'id'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
  }
};
