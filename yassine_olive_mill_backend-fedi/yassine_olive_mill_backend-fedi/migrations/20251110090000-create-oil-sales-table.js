export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('oil_sales', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    clientId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'clients', key: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    },
    userId: {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    },
    weight_kg: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    unit_price: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    total_amount: {
      type: Sequelize.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    notes: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW'),
    },
  });
}

export async function down(queryInterface) {
  await queryInterface.dropTable('oil_sales');
}
