var PlasmaChild = artifacts.require("./PlasmaChild.sol");
var TokenChild = artifacts.require("./TokenChild.sol");
var PlasmaParent = artifacts.require("./PlasmaParent.sol");
var TokenParent = artifacts.require("./TokenParent.sol");

module.exports = function(deployer) {
  deployer.deploy(PlasmaChild, { gas: 4700000 });
  deployer.deploy(TokenChild, 100000000,{ gas: 4700000 });
  deployer.deploy(PlasmaParent, { gas: 4700000 });
  deployer.deploy(TokenParent, 100000000,{ gas: 4700000 });
};
