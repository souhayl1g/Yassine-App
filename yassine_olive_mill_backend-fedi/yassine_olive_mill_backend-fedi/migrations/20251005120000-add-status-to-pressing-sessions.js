export async function up(queryInterface, Sequelize) {
  // Add status column to pressing_sessions table
  await queryInterface.addColumn('pressing_sessions', 'status', {
    type: Sequelize.ENUM('waiting', 'done', 'active'),
    allowNull: false,
    defaultValue: 'waiting'
  });
}

export async function down(queryInterface, Sequelize) {
  // Remove the status column
  await queryInterface.removeColumn('pressing_sessions', 'status');
  
  // Drop the enum type
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_pressing_sessions_status";');
}
