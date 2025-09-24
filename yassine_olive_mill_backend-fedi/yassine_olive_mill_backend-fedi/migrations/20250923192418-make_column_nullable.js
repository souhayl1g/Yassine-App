import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('batches', 'weight_in', {
    type: DataTypes.INTEGER,
    allowNull: true
  });

  await queryInterface.changeColumn('batches', 'weight_out', {
    type: DataTypes.INTEGER,
    allowNull: true
  });

  await queryInterface.changeColumn('batches', 'net_weight', {
    type: DataTypes.INTEGER,
    allowNull: true
  });

  await queryInterface.changeColumn('batches', 'number_of_boxes', {
    type: DataTypes.INTEGER,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn('batches', 'weight_in', {
    type: DataTypes.INTEGER,
    allowNull: false
  });

  await queryInterface.changeColumn('batches', 'weight_out', {
    type: DataTypes.INTEGER,
    allowNull: false
  });

  await queryInterface.changeColumn('batches', 'net_weight', {
    type: DataTypes.INTEGER,
    allowNull: false
  });

  await queryInterface.changeColumn('batches', 'number_of_boxes', {
    type: DataTypes.INTEGER,
    allowNull: false
  });
}
