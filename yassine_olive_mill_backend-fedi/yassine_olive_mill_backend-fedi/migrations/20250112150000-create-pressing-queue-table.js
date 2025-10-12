export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('pressing_queue', {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    batch_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'batches',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    number_of_boxes: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    operator_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    priority: {
      type: Sequelize.INTEGER,
      defaultValue: 0
    },
    status: {
      type: Sequelize.ENUM('queued', 'processing', 'completed'),
      defaultValue: 'queued'
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW
    }
  });

  // Add indexes for better performance
  await queryInterface.addIndex('pressing_queue', ['status', 'created_at']);
  await queryInterface.addIndex('pressing_queue', ['batch_id']);
  await queryInterface.addIndex('pressing_queue', ['operator_id']);
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('pressing_queue');
};
