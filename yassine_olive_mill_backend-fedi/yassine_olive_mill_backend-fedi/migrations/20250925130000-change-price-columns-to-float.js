'use strict';

export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('prices', 'milling_price_per_kg', {
    type: Sequelize.FLOAT,
    allowNull: true
  });
  await queryInterface.changeColumn('prices', 'oil_client_selling_price_per_kg', {
    type: Sequelize.FLOAT,
    allowNull: true
  });
  await queryInterface.changeColumn('prices', 'oil_export_selling_price_per_kg', {
    type: Sequelize.FLOAT,
    allowNull: true
  });
  await queryInterface.changeColumn('prices', 'olive_buying_price_per_kg', {
    type: Sequelize.FLOAT,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn('prices', 'milling_price_per_kg', {
    type: Sequelize.INTEGER,
    allowNull: true
  });
  await queryInterface.changeColumn('prices', 'oil_client_selling_price_per_kg', {
    type: Sequelize.INTEGER,
    allowNull: true
  });
  await queryInterface.changeColumn('prices', 'oil_export_selling_price_per_kg', {
    type: Sequelize.INTEGER,
    allowNull: true
  });
  await queryInterface.changeColumn('prices', 'olive_buying_price_per_kg', {
    type: Sequelize.INTEGER,
    allowNull: true
  });
}