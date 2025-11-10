import { DataTypes } from 'sequelize';

export const up = async (queryInterface, Sequelize) => {
  // Idempotent removal: only try to remove if column exists
  const table = await queryInterface.describeTable('prices');
  if (table['oil_client_selling_price_per_kg']) {
    await queryInterface.removeColumn('prices', 'oil_client_selling_price_per_kg');
  }
};

export const down = async (queryInterface, Sequelize) => {
  // Idempotent add back: only add if column missing
  const table = await queryInterface.describeTable('prices');
  if (!table['oil_client_selling_price_per_kg']) {
    await queryInterface.addColumn('prices', 'oil_client_selling_price_per_kg', {
      type: DataTypes.FLOAT,
      allowNull: true
    });
  }
};
