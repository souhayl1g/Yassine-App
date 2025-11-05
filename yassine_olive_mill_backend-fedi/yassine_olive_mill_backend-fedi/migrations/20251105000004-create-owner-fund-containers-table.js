'use strict';

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    let tableExists = false;
    try {
      await queryInterface.describeTable('owner_fund_containers');
      tableExists = true;
    } catch (e) {
      tableExists = false;
    }

    if (!tableExists) {
      await queryInterface.createTable('owner_fund_containers', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        ownerFundId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'owner_funds',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
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
        }
      });

      await queryInterface.addIndex('owner_fund_containers', ['ownerFundId'], {
        name: 'owner_fund_containers_ownerFundId_idx'
      });

      await queryInterface.addIndex('owner_fund_containers', ['containerId'], {
        name: 'owner_fund_containers_containerId_idx'
      });

      await queryInterface.addIndex('owner_fund_containers', ['ownerFundId', 'containerId'], {
        unique: true,
        name: 'owner_fund_containers_unique'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('owner_fund_containers');
  }
};

