export const up = async (queryInterface, Sequelize) => {
  const tableDescription = await queryInterface.describeTable('prices');
  
  if (!tableDescription.empty_bidon_price) {
    await queryInterface.addColumn('prices', 'empty_bidon_price', {
      type: Sequelize.FLOAT,
      allowNull: true,
      defaultValue: 0
    });
  }
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('prices', 'empty_bidon_price');
};
