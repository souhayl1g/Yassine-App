export async function up(queryInterface, Sequelize) {

  const tableDescription = await queryInterface.describeTable('pressing_sessions');

  if (!tableDescription.status) {

    await queryInterface.addColumn('pressing_sessions', 'status', {
    type: Sequelize.ENUM('waiting', 'done', 'active'),
    allowNull: false,
    defaultValue: 'waiting'
  });

  }
  // Add status column to pressing_sessions table
}

export async function down(queryInterface, Sequelize) {
  // Remove the status column
  await queryInterface.removeColumn('pressing_sessions', 'status');
  
  // Drop the enum type
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_pressing_sessions_status";');
}
