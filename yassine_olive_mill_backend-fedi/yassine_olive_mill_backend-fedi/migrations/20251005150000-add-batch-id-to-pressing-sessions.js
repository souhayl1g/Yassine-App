export async function up(queryInterface, Sequelize) {
  // Add batch_id column to pressing_sessions table
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

export async function down(queryInterface, Sequelize) {
  // Remove the batch_id column
  await queryInterface.removeColumn('pressing_sessions', 'batch_id');
}
