pragma solidity ^0.4.18;

contract PlasmaChild_submitonly {

  // parameters
  uint256 public current_plasma_bn = 1;
  uint256 public max_childnet_bn_included = 0;
  bool public processing = false;

  // structs

  // header
  struct PlasmaBlockHeader {
    uint32 blockNumber;
    uint32 numTransactions;
    bytes32 previousBlockHash;
    bytes32 merkleRootHash;
    uint8 v;
    bytes32 r;
    bytes32 s;
    bytes32 txHashOnMainnet;
    uint256 start_childnet_bn;
    uint256 end_childnet_bn;
  }
  mapping (uint32 => PlasmaBlockHeader) public plasmaBlockHeaders;

  // Owner Address
  address public ownerAddress;

  /* // token
  address public token; */

  // Modifiers
  modifier onlyOwner {
    if (msg.sender != ownerAddress) revert();
    _;
  }

  // Constructor
  function PlasmaChild_submitonly() public {
    ownerAddress = msg.sender;
  }

  function setProcessing(bool _flg) onlyOwner public returns (bool success) {
    processing = _flg;
    return true;
  }

  // update plasma header once block is created
  function updatePlasmaBlockHeader(
    uint32 _bn,
    uint32 _txCount,
    bytes32 _parentHash,
    bytes32 _merkleRootHash,
    uint8 _v,
    bytes32 _r,
    bytes32 _s,
    bytes32 txHashOnMainnet,
    uint256 max_bn_will_include
    ) onlyOwner public returns (bool success) {

      PlasmaBlockHeader ph = plasmaBlockHeaders[_bn];
      ph.blockNumber = _bn;
      ph.numTransactions = _txCount;
      ph.previousBlockHash = _parentHash;
      ph.merkleRootHash = _merkleRootHash;
      ph.v = _v;
      ph.r = _r;
      ph.s = _s;
      ph.txHashOnMainnet = txHashOnMainnet;
      ph.start_childnet_bn = max_childnet_bn_included + 1;
      ph.end_childnet_bn = max_bn_will_include;

      return true;
  }

  // plasma event
  event NewPlasmaBlockCreated(uint256 bn);

  uint8 public aaa1 = 0;
  uint8 public aaa2 = 0;

  // update plasma header once block is created
  function completePlasmaBlockHeader(
    uint32 _bn,
    uint32 _txCount,
    bytes32 _parentHash,
    bytes32 _merkleRootHash,
    uint8 _v,
    bytes32 _r,
    bytes32 _s,
    bytes32 txHashOnMainnet,
    uint256 max_bn_will_include
    ) onlyOwner public returns (bool success) {

      aaa1 = 0;
      if (processing == false) {
        aaa1 = 2;
        revert();
      }
      aaa1 = 5;

      aaa2 = 0;
      if (_bn != current_plasma_bn) {
        aaa2 = 2;
        revert();
      }
      aaa2 = 5;

      PlasmaBlockHeader storage ph = plasmaBlockHeaders[_bn];
      ph.blockNumber = uint32(current_plasma_bn);
      ph.numTransactions = _txCount;
      ph.previousBlockHash = _parentHash;
      ph.merkleRootHash = _merkleRootHash;
      ph.v = _v;
      ph.r = _r;
      ph.s = _s;
      ph.txHashOnMainnet = txHashOnMainnet;
      ph.start_childnet_bn = max_childnet_bn_included + 1;
      ph.end_childnet_bn = max_bn_will_include;

      // increment plasma block number
      current_plasma_bn = current_plasma_bn + 1;

      max_childnet_bn_included = max_bn_will_include;

      // update processing
      processing = false;

      NewPlasmaBlockCreated(current_plasma_bn);

      return true;
  }

  function resetPlasmaChild() onlyOwner public returns (bool success) {
    current_plasma_bn = 1;
    max_childnet_bn_included = 0;
    processing = false;
  }

  // change ownerheaders
  function transferOwner(address _address) public onlyOwner {
    ownerAddress = _address;
  }

  /* // change token address
  function setToken(address _address) public onlyOwner {
    token = _address;
  } */

  // kill contract itself
  function kill() onlyOwner public {
      selfdestruct(ownerAddress);
  }

  // fallback for ether
  function() payable public {
    revert();
  }
}
