export default {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('pressing_sessions');
    
    // Add oil_bidons_produced column if it doesn't exist
    if (!tableDescription.oil_bidons_produced) {
      await queryInterface.addColumn('pressing_sessions', 'oil_bidons_produced', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('pressing_sessions', 'oil_bidons_produced');
  }
};
