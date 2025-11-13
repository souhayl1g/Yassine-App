'use strict';

import { DataTypes } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('batch_loadings', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      batchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'batches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      pressingSessionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'pressing_sessions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      pressingRoomId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'pressing_rooms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      boxesLoaded: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Number of boxes loaded in this operation'
      },
      loadedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
        comment: 'When this loading operation occurred'
      },
      operatorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who performed the loading operation'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Additional notes about the loading operation'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes for better query performance (with error handling for existing indexes)
    try {
      await queryInterface.addIndex('batch_loadings', ['batchId']);
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }
    
    try {
      await queryInterface.addIndex('batch_loadings', ['pressingSessionId']);
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }
    
    try {
      await queryInterface.addIndex('batch_loadings', ['pressingRoomId']);
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }
    
    try {
      await queryInterface.addIndex('batch_loadings', ['loadedAt']);
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('batch_loadings');
  }
};
