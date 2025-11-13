'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    let tableExists = false;
    try {
      await queryInterface.describeTable('worker_payments');
      tableExists = true;
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable('worker_payments', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        workerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'workers',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        amount: {
          type: Sequelize.DECIMAL(10, 3),
          allowNull: false
        },
        type: {
          type: Sequelize.ENUM('advance', 'salary', 'other'),
          allowNull: false,
          defaultValue: 'advance'
        },
        method: {
          type: Sequelize.ENUM('cash', 'transfer', 'check'),
          allowNull: false,
          defaultValue: 'cash'
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

      await queryInterface.addIndex('worker_payments', ['workerId'], {
        name: 'worker_payments_workerId_idx'
      });

      await queryInterface.addIndex('worker_payments', ['date'], {
        name: 'worker_payments_date_idx'
      });

      await queryInterface.addIndex('worker_payments', ['type'], {
        name: 'worker_payments_type_idx'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('worker_payments');
  }
};

