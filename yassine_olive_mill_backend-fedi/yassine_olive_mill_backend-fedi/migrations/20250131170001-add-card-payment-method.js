export const up = async (queryInterface, Sequelize) => {
  // Add check constraint to ensure payment_method is either 'cash' or 'card'
  await queryInterface.addConstraint('batches', {
    fields: ['payment_method'],
    type: 'check',
    name: 'check_payment_method',
    where: {
      payment_method: ['cash', 'card']
    }
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Remove the check constraint
  await queryInterface.removeConstraint('batches', 'check_payment_method');
};
