// Migration script untuk deploy Library contract ke Sepolia testnet

const Library = artifacts.require("Library");

module.exports = function (deployer) {
    // Deploy Library contract
    deployer.deploy(Library);
};
