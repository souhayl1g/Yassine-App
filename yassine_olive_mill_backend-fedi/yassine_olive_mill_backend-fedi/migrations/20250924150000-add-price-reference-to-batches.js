import { DataTypes } from 'sequelize';

export async function up(queryInterface, Sequelize) {
  const tableDescription = await queryInterface.describeTable('batches');
  
  // Add priceId column to batches table only if it doesn't exist
  if (!tableDescription.priceId) {
    await queryInterface.addColumn('batches', 'priceId', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'prices',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add foreign key constraint
    await queryInterface.addConstraint('batches', {
      fields: ['priceId'],
      type: 'foreign key',
      name: 'fk_batches_price_id',
      references: {
        table: 'prices',
        field: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  }
}

export async function down(queryInterface, Sequelize) {
  // Remove foreign key constraint first
  await queryInterface.removeConstraint('batches', 'fk_batches_price_id');
  
  // Remove the priceId column
  await queryInterface.removeColumn('batches', 'priceId');
}