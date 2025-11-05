import db from './models/index.js';

const { sequelize } = db;

async function addColumn() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const queryInterface = sequelize.getQueryInterface();
    const Sequelize = sequelize.constructor;

    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('batches');
    
    if (!tableDescription.boxes_committed_to_queue) {
      console.log('Adding "boxes_committed_to_queue" column...');
      await queryInterface.addColumn('batches', 'boxes_committed_to_queue', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Number of boxes committed to pressing queue (reserved but not yet loaded)'
      });
      console.log('✅ Added "boxes_committed_to_queue" column');
    } else {
      console.log('✓ "boxes_committed_to_queue" column already exists');
    }

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addColumn();

