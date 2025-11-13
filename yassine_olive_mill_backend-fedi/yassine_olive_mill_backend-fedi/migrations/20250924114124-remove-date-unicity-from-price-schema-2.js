import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  // Remove the unique constraint from the date column
  try {
    await queryInterface.removeConstraint('prices', 'prices_date_key');
  } catch (error) {
    // If constraint name is different, try alternative names
    try {
      await queryInterface.removeIndex('prices', 'prices_date_unique');
    } catch (indexError) {
      console.log('Unique constraint may not exist or has different name');
    }
  }
  
  // Update the column definition to remove unique constraint
  await queryInterface.changeColumn('prices', 'date', {
    type: DataTypes.DATEONLY,
    allowNull: true,
    unique: false // Explicitly remove unique constraint
  });
}

export async function down(queryInterface, Sequelize) {
  // Re-add the unique constraint
  await queryInterface.changeColumn('prices', 'date', {
    type: DataTypes.DATEONLY,
    allowNull: true,
    unique: true // Restore unique constraint
  });
  
  // Add the constraint back
  await queryInterface.addConstraint('prices', {
    fields: ['date'],
    type: 'unique',
    name: 'prices_date_key'
  });
}