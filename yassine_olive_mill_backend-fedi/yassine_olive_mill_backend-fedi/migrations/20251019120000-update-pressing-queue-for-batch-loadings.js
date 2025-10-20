'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if batch_loading_id column exists before adding it
      const pressingQueueTable = await queryInterface.describeTable('pressing_queue');
      if (!pressingQueueTable.batch_loading_id) {
        await queryInterface.addColumn('pressing_queue', 'batch_loading_id', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'batch_loadings',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        }, { transaction });
      }

      // Check if boxes_committed_to_queue column exists before adding it
      const batchesTable = await queryInterface.describeTable('batches');
      if (!batchesTable.boxes_committed_to_queue) {
        await queryInterface.addColumn('batches', 'boxes_committed_to_queue', {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
          comment: 'Number of boxes committed to pressing queue (reserved but not yet loaded)'
        }, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if columns exist before removing them
      const batchesTable = await queryInterface.describeTable('batches');
      if (batchesTable.boxes_committed_to_queue) {
        await queryInterface.removeColumn('batches', 'boxes_committed_to_queue', { transaction });
      }

      const pressingQueueTable = await queryInterface.describeTable('pressing_queue');
      if (pressingQueueTable.batch_loading_id) {
        await queryInterface.removeColumn('pressing_queue', 'batch_loading_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
