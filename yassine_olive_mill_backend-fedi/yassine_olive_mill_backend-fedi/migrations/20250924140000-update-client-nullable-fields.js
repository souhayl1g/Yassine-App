import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  // Update phone column to allow null
  await queryInterface.changeColumn('clients', 'phone', {
    type: DataTypes.STRING,
    allowNull: true
  });

  // Update address column to allow null
  await queryInterface.changeColumn('clients', 'address', {
    type: DataTypes.STRING,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  // Revert phone column to not allow null
  await queryInterface.changeColumn('clients', 'phone', {
    type: DataTypes.STRING,
    allowNull: false
  });

  // Revert address column to not allow null
  await queryInterface.changeColumn('clients', 'address', {
    type: DataTypes.STRING,
    allowNull: false
  });
}