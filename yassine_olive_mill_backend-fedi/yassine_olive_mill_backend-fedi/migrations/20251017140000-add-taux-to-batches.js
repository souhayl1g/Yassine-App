export async function up(queryInterface, Sequelize) {
  // Add taux column to batches table
  await queryInterface.addColumn('batches', 'taux', {
    type: Sequelize.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Oil extraction percentage (taux) used for sale operations calculations'
  });
}

export async function down(queryInterface, Sequelize) {
  // Remove the taux column
  await queryInterface.removeColumn('batches', 'taux');
}
