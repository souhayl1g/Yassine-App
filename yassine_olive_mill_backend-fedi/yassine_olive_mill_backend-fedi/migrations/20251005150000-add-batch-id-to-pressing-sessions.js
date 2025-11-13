export async function up(queryInterface, Sequelize) {
  const tableDescription = await queryInterface.describeTable('pressing_sessions');
  
  // Add batch_id column to pressing_sessions table only if it doesn't exist
  if (!tableDescription.batch_id) {
    await queryInterface.addColumn('pressing_sessions', 'batch_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'batches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
}

export async function down(queryInterface, Sequelize) {
  // Remove the batch_id column
  await queryInterface.removeColumn('pressing_sessions', 'batch_id');
}
