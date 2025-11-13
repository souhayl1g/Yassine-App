export async function up(queryInterface, Sequelize) {
  // First, update any existing 'employee' records to 'operator'
  await queryInterface.sequelize.query(
    "UPDATE users SET role = 'operator' WHERE role = 'employee'"
  );

  // Drop the old enum type and create a new one
  // Note: This approach works for PostgreSQL. For MySQL, you might need a different approach.
  await queryInterface.sequelize.query(`
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS users_role_check;
  `);

  // Change the column type to remove the old enum and add the new one
  await queryInterface.changeColumn('users', 'role', {
    type: Sequelize.ENUM('admin', 'manager', 'operator', 'scanner'),
    allowNull: false,
    defaultValue: 'operator'
  });
}

export async function down(queryInterface, Sequelize) {
  // First, update any existing 'operator' records to 'employee'
  await queryInterface.sequelize.query(
    "UPDATE users SET role = 'employee' WHERE role = 'operator'"
  );

  // Drop the constraint if it exists
  await queryInterface.sequelize.query(`
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS users_role_check;
  `);

  // Revert the column type to the old enum
  await queryInterface.changeColumn('users', 'role', {
    type: Sequelize.ENUM('admin', 'manager', 'employee', 'scanner'),
    allowNull: false,
    defaultValue: 'employee'
  });
}