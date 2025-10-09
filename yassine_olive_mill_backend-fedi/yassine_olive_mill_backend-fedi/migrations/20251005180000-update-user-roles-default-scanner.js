export async function up(queryInterface, Sequelize) {
  // Drop the old enum constraint
  await queryInterface.sequelize.query(`
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS users_role_check;
  `);

  // Change the column type to remove the old enum and add the new one
  await queryInterface.changeColumn('users', 'role', {
    type: Sequelize.ENUM('admin', 'operator', 'scanner', 'employee'),
    allowNull: false,
    defaultValue: 'scanner'
  });
}

export async function down(queryInterface, Sequelize) {
  // Drop the constraint if it exists
  await queryInterface.sequelize.query(`
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS users_role_check;
  `);

  // Revert the column type to the previous enum (with manager)
  await queryInterface.changeColumn('users', 'role', {
    type: Sequelize.ENUM('admin', 'manager', 'scanner', 'employee'),
    allowNull: false,
    defaultValue: 'scanner'
  });
}
