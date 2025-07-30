module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Suppress source map warnings from WalletConnect packages
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /ENOENT: no such file or directory/,
        /@walletconnect/
      ];
      
      return webpackConfig;
    },
  },
}; 