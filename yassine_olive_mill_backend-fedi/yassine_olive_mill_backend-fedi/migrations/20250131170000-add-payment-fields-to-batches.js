export const up = async (queryInterface, Sequelize) => {
  await queryInterface.addColumn('batches', 'unit_price', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true
  });
  
  await queryInterface.addColumn('batches', 'total_amount', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true
  });
  
  await queryInterface.addColumn('batches', 'is_paid', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });
  
  await queryInterface.addColumn('batches', 'payment_method', {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: 'cash'
  });
  
  await queryInterface.addColumn('batches', 'payment_reference', {
    type: Sequelize.STRING,
    allowNull: true
  });
  
  await queryInterface.addColumn('batches', 'date_paid', {
    type: Sequelize.DATE,
    allowNull: true
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.removeColumn('batches', 'unit_price');
  await queryInterface.removeColumn('batches', 'total_amount');
  await queryInterface.removeColumn('batches', 'is_paid');
  await queryInterface.removeColumn('batches', 'payment_method');
  await queryInterface.removeColumn('batches', 'payment_reference');
  await queryInterface.removeColumn('batches', 'date_paid');
};
