export async function up(queryInterface, Sequelize) {
  const tableDescription = await queryInterface.describeTable('batches');
  
  // Add operation_type column to batches table only if it doesn't exist
  if (!tableDescription.operation_type) {
    await queryInterface.addColumn('batches', 'operation_type', {
      type: Sequelize.ENUM('milling', 'sale'),
      allowNull: true,
      defaultValue: 'milling'
    });
  }
}

export async function down(queryInterface, Sequelize) {
  // Remove the operation_type column
  await queryInterface.removeColumn('batches', 'operation_type');
  
  // Drop the enum type
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_batches_operation_type";');
}