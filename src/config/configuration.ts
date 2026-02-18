export default () => ({
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
        url: process.env.DATABASE_URL,
        replica1Url: process.env.DATABASE_URL_REPLICA_1,
        replica2Url: process.env.DATABASE_URL_REPLICA_2,
    },
});
