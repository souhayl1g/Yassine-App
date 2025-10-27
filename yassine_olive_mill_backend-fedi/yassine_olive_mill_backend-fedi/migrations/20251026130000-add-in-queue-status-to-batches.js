'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const dialect = queryInterface.sequelize.getDialect();
        
        const statusEnum = ['received', 'in_queue', 'in_process', 'completed'];
        
        switch(dialect) {
            case 'postgres':
                await queryInterface.sequelize.query(`
                    ALTER TYPE "enum_batches_status" ADD VALUE 'in_queue';
                `);
                break;
                
            case 'mysql':
            default:
                await queryInterface.changeColumn('batches', 'status', {
                    type: Sequelize.ENUM(...statusEnum),
                    allowNull: false,
                    defaultValue: 'received'
                });
        }
    },

    down: async (queryInterface, Sequelize) => {
        const dialect = queryInterface.sequelize.getDialect();
        const oldStatusEnum = ['received', 'in_process', 'completed'];
        
        if (dialect === 'postgres') {
            const queries = [`
                UPDATE batches SET status = 'received' WHERE status = 'in_queue';
            `,`
                ALTER TYPE "enum_batches_status" RENAME TO "enum_batches_status_old";
                CREATE TYPE "enum_batches_status" AS ENUM('received', 'in_process', 'completed');
                ALTER TABLE batches ALTER COLUMN status TYPE "enum_batches_status" USING status::text::"enum_batches_status";
                DROP TYPE "enum_batches_status_old";
            `];
            
            for (const query of queries) {
                await queryInterface.sequelize.query(query);
            }
        } else {
            await queryInterface.sequelize.query(`
                UPDATE batches SET status = 'received' WHERE status = 'in_queue';
            `);
            
            await queryInterface.changeColumn('batches', 'status', {
                type: Sequelize.ENUM(...oldStatusEnum),
                allowNull: false,
                defaultValue: 'received'
            });
        }
    }
};
