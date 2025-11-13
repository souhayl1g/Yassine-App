'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('queuer_sessions', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            queueId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'ID of the queuer user'
            },
            currentBatchId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'batches',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'Current batch being processed by this queuer'
            },
            totalBoxes: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'Total boxes in the batch when session started'
            },
            boxesQueued: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Number of boxes already queued from this batch'
            },
            startedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
                comment: 'When this queuer session started'
            },
            completedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'When this queuer session was completed (all boxes queued)'
            },
            status: {
                type: Sequelize.ENUM('active', 'completed', 'cancelled'),
                allowNull: false,
                defaultValue: 'active',
                comment: 'Status of the queuer session'
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW
            }
        });

        await queryInterface.addIndex('queuer_sessions', ['queueId']);
        await queryInterface.addIndex('queuer_sessions', ['currentBatchId']);
        await queryInterface.addIndex('queuer_sessions', ['status']);
        
        await queryInterface.addConstraint('queuer_sessions', {
            fields: ['queueId'],
            type: 'unique',
            name: 'unique_active_queuer_session',
            where: {
                status: 'active'
            }
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('queuer_sessions');
    }
};
