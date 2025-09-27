export async function up(queryInterface, Sequelize) {
  // Check if table exists and get description
  const tableDescription = await queryInterface.describeTable('batches');
  
  // Add pressing_room_id column if it doesn't exist
  if (!tableDescription.pressing_room_id) {
    await queryInterface.addColumn('batches', 'pressing_room_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'pressing_rooms',
        key: 'id'
      }
    });
  }

  // Add session_start_time column if it doesn't exist
  if (!tableDescription.session_start_time) {
    await queryInterface.addColumn('batches', 'session_start_time', {
      type: Sequelize.DATE,
      allowNull: true
    });
  }

  // Add estimated_time column if it doesn't exist (in minutes)
  if (!tableDescription.estimated_time) {
    await queryInterface.addColumn('batches', 'estimated_time', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 60, // Default 60 minutes
      comment: 'Estimated processing time in minutes'
    });
  }

  // Add ticket_number column if it doesn't exist
  if (!tableDescription.ticket_number) {
    await queryInterface.addColumn('batches', 'ticket_number', {
      type: Sequelize.STRING,
      allowNull: true,
      unique: false
    });
  }
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('batches', 'pressing_room_id');
  await queryInterface.removeColumn('batches', 'session_start_time');
  await queryInterface.removeColumn('batches', 'estimated_time');
  await queryInterface.removeColumn('batches', 'ticket_number');
}