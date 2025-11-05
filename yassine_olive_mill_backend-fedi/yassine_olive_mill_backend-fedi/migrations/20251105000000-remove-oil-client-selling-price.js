import { DataTypes } from 'sequelize';

export const up = async (queryInterface, Sequelize) => {
  // Remove the oil_client_selling_price_per_kg column from the prices table
  await queryInterface.removeColumn('prices', 'oil_client_selling_price_per_kg');
};

export const down = async (queryInterface, Sequelize) => {
  // Add back the oil_client_selling_price_per_kg column if rollback is needed
  await queryInterface.addColumn('prices', 'oil_client_selling_price_per_kg', {
    type: DataTypes.FLOAT,
    allowNull: true
  });
};
