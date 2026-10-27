const DevelopmentSmsAdapter = require('./developmentSmsAdapter');
const ProductionSmsAdapter = require('./productionSmsAdapter');

/**
 * Factory resolver for SMS delivery provider.
 */
const getSmsProvider = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasProdConfig = process.env.SMS_PROVIDER && process.env.SMS_PROVIDER !== 'mock' && process.env.SMS_PROVIDER !== 'none';

  if (isProduction || hasProdConfig) {
    return new ProductionSmsAdapter();
  }

  return new DevelopmentSmsAdapter();
};

module.exports = {
  getSmsProvider,
  DevelopmentSmsAdapter,
  ProductionSmsAdapter,
};
