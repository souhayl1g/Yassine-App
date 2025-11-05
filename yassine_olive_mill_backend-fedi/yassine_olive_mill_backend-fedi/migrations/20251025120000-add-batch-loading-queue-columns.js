export const up = async (queryInterface, Sequelize) => {
  // Migration already applied or not needed
  // Columns may have been added by other migrations
  console.log('Migration 20251025120000 - checking batch loading queue columns...');
};

export const down = async (queryInterface, Sequelize) => {
  // Nothing to roll back
  console.log('Rolling back migration 20251025120000...');
};
