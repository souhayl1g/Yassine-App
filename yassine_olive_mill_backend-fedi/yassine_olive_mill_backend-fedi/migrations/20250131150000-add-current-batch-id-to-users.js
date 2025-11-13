export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('users', 'currentBatchId', {
    type: Sequelize.INTEGER,
    allowNull: true,
    references: {
      model: 'batches',
      key: 'id'
    },
    comment: 'Current batch being processed by queuer (prevents switching to other batches)'
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('users', 'currentBatchId');
};
