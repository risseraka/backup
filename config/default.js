module.exports = {
    memcache: {
        engine: 'memcache',
        partition: 'auth',
        location: '127.0.0.1:11211',
        ttl: {
            user: 24 * 3600 * 1000
        }
    },

    facebook: {
        clientId: '92601131724',
        clientSecret: 'd14f54eb8013c4604687225fc905e160'
    },

    twitter: {
        consumerKey: 'XDhPOfEgvAfzFUPUWHhQ',
        consumerSecret: 'dUT9wdqV0neYu93qsQE79Ny8JzY6blK8BoVb1mfeDBM'
    },

    google: {
        clientId: '410681330301.apps.googleusercontent.com',
        clientSecret: 'I2xgEom_U-mMvBRCBCzQ3W5I'
    }
};
