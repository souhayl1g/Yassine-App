import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  // Change price columns from INTEGER to FLOAT
  await queryInterface.changeColumn('prices', 'milling_price_per_kg', {
    type: DataTypes.FLOAT,
    allowNull: true
  });

  await queryInterface.changeColumn('prices', 'oil_client_selling_price_per_kg', {
    type: DataTypes.FLOAT,
    allowNull: true
  });

  await queryInterface.changeColumn('prices', 'oil_export_selling_price_per_kg', {
    type: DataTypes.FLOAT,
    allowNull: true
  });

  await queryInterface.changeColumn('prices', 'olive_buying_price_per_kg', {
    type: DataTypes.FLOAT,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  // Revert back to INTEGER (note: this may cause data loss if there are decimal values)
  await queryInterface.changeColumn('prices', 'milling_price_per_kg', {
    type: DataTypes.INTEGER,
    allowNull: true
  });

  await queryInterface.changeColumn('prices', 'oil_client_selling_price_per_kg', {
    type: DataTypes.INTEGER,
    allowNull: true
  });

  await queryInterface.changeColumn('prices', 'oil_export_selling_price_per_kg', {
    type: DataTypes.INTEGER,
    allowNull: true
  });

  await queryInterface.changeColumn('prices', 'olive_buying_price_per_kg', {
    type: DataTypes.INTEGER,
    allowNull: true
  });
}
