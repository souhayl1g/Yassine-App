import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  // Remove the unique constraint from the date column in prices table
  try {
    // Try to remove the constraint by different possible names
    await queryInterface.removeConstraint('prices', 'prices_date_key');
  } catch (error) {
    try {
      await queryInterface.removeConstraint('prices', 'prices_date_unique');
    } catch (error2) {
      try {
        await queryInterface.removeIndex('prices', 'prices_date_unique');
      } catch (error3) {
        try {
          await queryInterface.removeIndex('prices', ['date']);
        } catch (error4) {
          console.log('No unique constraint found on prices.date column, or already removed');
        }
      }
    }
  }
  
  // Update the column definition to ensure no unique constraint
  await queryInterface.changeColumn('prices', 'date', {
    type: DataTypes.DATEONLY,
    allowNull: true,
    unique: false
  });
}

export async function down(queryInterface, Sequelize) {
  // Re-add the unique constraint
  await queryInterface.changeColumn('prices', 'date', {
    type: DataTypes.DATEONLY,
    allowNull: true,
    unique: true
  });
  
  // Add the constraint back
  await queryInterface.addConstraint('prices', {
    fields: ['date'],
    type: 'unique',
    name: 'prices_date_unique'
  });
}
