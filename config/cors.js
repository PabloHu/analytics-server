module.exports = {
  origin: [
    'https://frutasdelcampo.com',
    'https://littleanimeshop.com',
    'https://frutalesdelcarmelo.com',
    'https://kiwichito.com',
    'https://www.kiwichito.com',
    'https://app.kiwichito.com',
    'https://admin.kiwichito.com',
    'http://kiwichito.com',
    'http://www.kiwichito.com',
    'http://localhost:4200',  // Angular dev
    'http://localhost:3000',  // React dev
    'http://localhost:3001',  // Local testing
  ],
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Master-Key', 'Authorization'],
};
