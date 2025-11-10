export const up = async (queryInterface, Sequelize) => {
  // Make migration idempotent: only add columns that don't exist
  const table = await queryInterface.describeTable('batches');

  const addIfMissing = async (name, definition) => {
    if (!table[name]) {
      await queryInterface.addColumn('batches', name, definition);
    }
  };

  await addIfMissing('unit_price', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
  });

  await addIfMissing('total_amount', {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true,
  });

  await addIfMissing('is_paid', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await addIfMissing('payment_method', {
    type: Sequelize.STRING,
    allowNull: true,
    defaultValue: 'cash',
  });

  await addIfMissing('payment_reference', {
    type: Sequelize.STRING,
    allowNull: true,
  });

  await addIfMissing('date_paid', {
    type: Sequelize.DATE,
    allowNull: true,
  });
};

export const down = async (queryInterface, Sequelize) => {
  // Only remove if the column exists
  const table = await queryInterface.describeTable('batches');
  const removeIfPresent = async (name) => {
    if (table[name]) {
      await queryInterface.removeColumn('batches', name);
    }
  };

  await removeIfPresent('unit_price');
  await removeIfPresent('total_amount');
  await removeIfPresent('is_paid');
  await removeIfPresent('payment_method');
  await removeIfPresent('payment_reference');
  await removeIfPresent('date_paid');
};
