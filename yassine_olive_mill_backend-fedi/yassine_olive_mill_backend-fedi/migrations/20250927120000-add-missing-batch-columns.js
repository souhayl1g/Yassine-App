export async function up(queryInterface, Sequelize) {
  // Check if priceId column exists, if not add it
  const tableDescription = await queryInterface.describeTable('batches');
  
  if (!tableDescription.priceId) {
    await queryInterface.addColumn('batches', 'priceId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'prices',
        key: 'id'
      }
    });
  }

  // Add number_of_bidons column if it doesn't exist
  if (!tableDescription.number_of_bidons) {
    await queryInterface.addColumn('batches', 'number_of_bidons', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('batches', 'priceId');
  await queryInterface.removeColumn('batches', 'number_of_bidons');
}