export const up = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('batches', 'boxes_committed_to_queue');
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('batches', 'boxes_committed_to_queue', {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'Number of boxes committed to pressing queue (reserved but not yet loaded)'
  });
};
