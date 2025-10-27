'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the unique constraint from the date column in prices table
    try {
      // Try to remove the constraint by different possible names
      await queryInterface.removeConstraint('prices', 'prices_date_key');
    } catch {
      try {
        await queryInterface.removeConstraint('prices', 'prices_date_unique');
      } catch {
        try {
          await queryInterface.removeIndex('prices', 'prices_date_unique');
        } catch {
          try {
            await queryInterface.removeIndex('prices', ['date']);
          } catch {
            console.log('No unique constraint found on prices.date column, or already removed');
          }
        }
      }
    }
  
    // Update the column definition to ensure no unique constraint
    return queryInterface.changeColumn('prices', 'date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      unique: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Re-add the unique constraint
    await queryInterface.changeColumn('prices', 'date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      unique: true
    });
    
    // Add the constraint back
    return queryInterface.addConstraint('prices', {
      fields: ['date'],
      type: 'unique',
      name: 'prices_date_unique'
    });
  }
};
