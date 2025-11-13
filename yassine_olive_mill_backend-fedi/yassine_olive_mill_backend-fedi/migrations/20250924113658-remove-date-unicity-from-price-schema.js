import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('prices', 'date', {
    type: DataTypes.DATEONLY,
    required: true
  });

}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn('prices', 'date', {
    type: DataTypes.DATEONLY,
    required: false
  });

}