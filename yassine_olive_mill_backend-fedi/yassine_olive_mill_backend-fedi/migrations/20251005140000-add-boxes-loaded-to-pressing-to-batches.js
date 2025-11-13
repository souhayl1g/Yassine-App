export async function up(queryInterface, Sequelize) {

  const tableDescription = await queryInterface.describeTable('batches');

  if (!tableDescription.boxes_loaded_to_pressing) {

    await queryInterface.addColumn('batches', 'boxes_loaded_to_pressing', {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'Number of boxes loaded into pressing (cannot exceed number_of_boxes)'
  });

  }
  // Add boxes_loaded_to_pressing column to batches table
}

export async function down(queryInterface, Sequelize) {
  // Remove the boxes_loaded_to_pressing column
  await queryInterface.removeColumn('batches', 'boxes_loaded_to_pressing');
}
