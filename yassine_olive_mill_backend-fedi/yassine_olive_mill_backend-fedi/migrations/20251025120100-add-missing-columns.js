'use strict';

/** @type {import('sequelize-cli').Migration} */
export const up = async (queryInterface, Sequelize) => {
  const transaction = await queryInterface.sequelize.transaction();
  
  try {
    // Check if taux column exists before adding it
    const batchesColumns = await queryInterface.describeTable('batches');
    if (!batchesColumns.taux) {
      await queryInterface.addColumn('batches', 'taux', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        comment: 'Oil extraction percentage (taux) used for sale operations calculations'
      }, { transaction });
    }

    // Also add boxes_committed_to_queue if it doesn't exist
    if (!batchesColumns.boxes_committed_to_queue) {
      await queryInterface.addColumn('batches', 'boxes_committed_to_queue', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of boxes committed to pressing queue (reserved but not yet loaded)'
      }, { transaction });
    }

    // Check pressing_queue table and add batch_loading_id if needed
    const pressingQueueColumns = await queryInterface.describeTable('pressing_queue');
    if (!pressingQueueColumns.batch_loading_id) {
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

    await transaction.commit();
    console.log('Successfully added missing columns to batches and pressing_queue tables');
  } catch (error) {
    await transaction.rollback();
    console.error('Error adding columns:', error);
    throw error;
  }
};

export const down = async (queryInterface, Sequelize) => {
  const transaction = await queryInterface.sequelize.transaction();
  
  try {
    // Remove columns in reverse order
    const batchesColumns = await queryInterface.describeTable('batches');
    if (batchesColumns.boxes_committed_to_queue) {
      await queryInterface.removeColumn('batches', 'boxes_committed_to_queue', { transaction });
    }
    
    if (batchesColumns.taux) {
      await queryInterface.removeColumn('batches', 'taux', { transaction });
    }

    const pressingQueueColumns = await queryInterface.describeTable('pressing_queue');
    if (pressingQueueColumns.batch_loading_id) {
      await queryInterface.removeColumn('pressing_queue', 'batch_loading_id', { transaction });
    }

    await transaction.commit();
    console.log('Successfully removed columns from batches and pressing_queue tables');
  } catch (error) {
    await transaction.rollback();
    console.error('Error removing columns:', error);
    throw error;
  }
};
