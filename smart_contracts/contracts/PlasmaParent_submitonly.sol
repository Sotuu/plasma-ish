/* pragma solidity ^0.4.18; */
pragma solidity ^0.4.8;

library Bytes {
  function concat(bytes memory self, bytes memory bts) internal view returns (bytes memory newBts) {
    uint totLen = self.length + bts.length;
    if (totLen == 0)
      return;
    newBts = new bytes(totLen);
    assembly {
        let i := 0
        let inOffset := 0
        let outOffset := add(newBts, 0x20)
        let words := 0
        let tag := tag_bts
      tag_self:
        inOffset := add(self, 0x20)
        words := div(add(mload(self), 31), 32)
        jump(tag_loop)
      tag_bts:
        i := 0
        inOffset := add(bts, 0x20)
        outOffset := add(newBts, add(0x20, mload(self)))
        words := div(add(mload(bts), 31), 32)
        tag := tag_end
      tag_loop:
        jumpi(tag, gt(i, words))
        {
          let offset := mul(i, 32)
          outOffset := add(outOffset, offset)
          mstore(outOffset, mload(add(inOffset, offset)))
          i := add(i, 1)
        }
        jump(tag_loop)
      tag_end:
        mstore(add(newBts, add(totLen, 0x20)), 0)
    }
  }

  function uintToBytes(uint self) internal pure returns (bytes memory s) {
    uint maxlength = 100;
    bytes memory reversed = new bytes(maxlength);
    uint i = 0;
    while (self != 0) {
      uint remainder = self % 10;
      self = self / 10;
      reversed[i++] = byte(48 + remainder);
    }
    s = new bytes(i);
    for (uint j = 0; j < i; j++) {
      s[j] = reversed[i - 1 - j];
    }
    return s;
  }
}

contract PlasmaParent_submitonly {

  // The owner
  address public owner;

  // TokenParent Contract Address
  // CrowdsaleToken public token;
  /* address public token; */

  // Modifiers: only owner
  modifier onlyOwner {
    if (msg.sender != owner) revert();
    _;
  }
  /* // Modifiers: only token
  modifier onlyToken {
    if (msg.sender != address(token)) revert();
    _;
  } */

  /* // Modifiers: only token
  modifier onlyTokenOrOwner {
    if (msg.sender != address(token) && msg.sender != owner) revert();
    _;
  } */

  // Constructor
  function PlasmaParent_submitonly() public {
    owner = msg.sender;
/*
    if ( address(_token) != 0 ){
      token = _token;
    } */
  }

  /* // set token address
  function setToken(address _token) public onlyOwner {
    token = _token;
  } */

  // change ownerheaders
  function transferOwner(address _address) public onlyOwner {
    owner = _address;
  }

  // kill contract itself
  function kill() onlyOwner public {
      selfdestruct(owner);
  }

  // fallback for ether
  function() payable public {
    revert();
  }

  //
  // for PLASMA
  //

  // library
  using Bytes for *;

  // variables
  uint256 public lastBlockNumber = 0;

  // A list of Plasma blocks
  struct Header {
      uint32 blockNumber;
      uint32 numTransactions;
      uint8 v;
      bytes32 previousBlockHash;
      bytes32 merkleRootHash;
      bytes32 r;
      bytes32 s;
  }
  mapping (uint256 => Header) public headers;

  uint32 public blockHeaderLength = 137;

  uint256 constant SignatureLength = 65;
  uint256 constant BlockNumberLength = 4;
  uint256 constant TxNumberLength = 4;
  uint256 constant PreviousHashLength = 32;
  uint256 constant MerkleRootHashLength = 32;

  // CAN NOT COMPILE THIS LINE!!!!
  // NEED TO USE bytes32 ???
  /* bytes constant PersonalMessagePrefixBytes = "\x19Ethereum Signed Message:\n"; */
  bytes PersonalMessagePrefixBytes = "\x19Ethereum Signed Message:\n";


  uint256 constant public PreviousBlockPersonalHashLength = BlockNumberLength +
                                                TxNumberLength +
                                                PreviousHashLength +
                                                MerkleRootHashLength +
                                                SignatureLength;
  uint256 constant NewBlockPersonalHashLength = BlockNumberLength +
                                                      TxNumberLength +
                                                      PreviousHashLength +
                                                      MerkleRootHashLength;


  //
  // convenient helper functions
  //
  function extract32(bytes data, uint pos) pure internal returns (bytes32 result) {
    for (uint256 i = 0; i < 32; i++) {
      result ^= (bytes32(0xff00000000000000000000000000000000000000000000000000000000000000)&data[i+pos])>>(i*8);
    }
  }

  function extract20(bytes data, uint pos) pure internal returns (bytes20 result) {
    for (uint256 i = 0; i < 20; i++) {
      result ^= (bytes20(0xff00000000000000000000000000000000000000)&data[i+pos])>>(i*8);
    }
  }

  function extract4(bytes data, uint pos) pure internal returns (bytes4 result) {
    for (uint256 i = 0; i < 4; i++) {
      result ^= (bytes4(0xff000000)&data[i+pos])>>(i*8);
    }
  }

  function extract2(bytes data, uint pos) pure internal returns (bytes2  result) {
    for (uint256 i = 0; i < 2; i++) {
      result ^= (bytes2(0xff00)&data[i+pos])>>(i*8);
    }
  }

  function extract1(bytes data, uint pos) pure internal returns (bytes1  result) {
    for (uint256 i = 0; i < 1; i++) {
      result ^= (bytes1(0xff)&data[i+pos])>>(i*8);
    }
  }

  //
  // events
  //

  // when block header submitted
  event HeaderSubmittedEvent(address indexed _signer, uint32 indexed _blockNumber, bytes32 indexed _blockHash);

  // debug fucntion
  function updateLastBlockNumber(uint32 _blockNumber) public onlyOwner returns (bool success) {
    lastBlockNumber = uint256(uint32(_blockNumber));
    return true;
  }

  //
  // submit plasma block header
  //

  uint256 public submitBlock3_1;
  uint8 public submitBlock3_2;
  uint8 public submitBlock3_3;
  address public submitBlock3_4;
  bytes32 public submitBlock3_5;
  uint8 public submitBlock3_6;

  // for debugging
  function submitBlock3(bytes header) public onlyOwner returns (bool success) {

      submitBlock3_1 = 0;
      submitBlock3_3 = 0;
      submitBlock3_4 = 0;
      submitBlock3_6 = 0;

      if (header.length != blockHeaderLength) {
        submitBlock3_1 = header.length;
        return true;
      }
      submitBlock3_1 = 9;

      uint32 blockNumber = uint32(extract4(header, 0));
      uint32 numTransactions = uint32(extract4(header, BlockNumberLength));
      bytes32 previousBlockHash = extract32(header, BlockNumberLength + TxNumberLength);
      bytes32 merkleRootHash = extract32(header, BlockNumberLength + TxNumberLength + PreviousHashLength);
      uint8 v = uint8(extract1(header, BlockNumberLength + TxNumberLength + PreviousHashLength + MerkleRootHashLength));
      bytes32 r = extract32(header, BlockNumberLength + TxNumberLength + PreviousHashLength + MerkleRootHashLength + 1);
      bytes32 s = extract32(header, BlockNumberLength + TxNumberLength + PreviousHashLength + MerkleRootHashLength + 33);
      uint256 newBlockNumber = uint256(uint32(blockNumber));

      if (newBlockNumber != lastBlockNumber+1) {
        submitBlock3_2 = 5;
        return true;
      }
      submitBlock3_2 = 9;

      if (lastBlockNumber != 0) {
          Header storage previousHeader = headers[lastBlockNumber];
          bytes32 previousHash = keccak256(PersonalMessagePrefixBytes, bytes32(PreviousBlockPersonalHashLength), previousHeader.blockNumber, previousHeader.numTransactions, previousHeader.previousBlockHash, previousHeader.merkleRootHash, previousHeader.v, previousHeader.r, previousHeader.s);

          if (previousHash != previousBlockHash) {
            submitBlock3_3 = uint8(PreviousBlockPersonalHashLength);
            return true;
          }
          submitBlock3_3 = 9;
      }

      bytes32 newBlockHash = keccak256(PersonalMessagePrefixBytes, bytes32(NewBlockPersonalHashLength), blockNumber, numTransactions, previousBlockHash, merkleRootHash);

      if (v < 27) {
          v = v+27;
      }
      address signer = ecrecover(newBlockHash, v, r, s);

      if (signer != owner ) {
        submitBlock3_4 = signer;
        submitBlock3_5 = newBlockHash;
        return true;
      }

      submitBlock3_6 = 9;

      Header memory newHeader = Header({
          blockNumber: blockNumber,
          numTransactions: numTransactions,
          previousBlockHash: previousBlockHash,
          merkleRootHash: merkleRootHash,
          v: v,
          r: r,
          s: s
      });
      lastBlockNumber = lastBlockNumber+1;
      headers[lastBlockNumber] = newHeader;
      HeaderSubmittedEvent(signer, blockNumber, newBlockHash);
      return true;
  }

  // for proof
  function createPersonalMessageTypeHash(bytes memory message) public view returns (bytes32 msgHash) {
      // bytes memory prefixBytes = "\x19Ethereum Signed Message:\n";
      bytes memory lengthBytes = message.length.uintToBytes();
      // bytes memory prefix = prefixBytes.concat(lengthBytes);
      bytes memory prefix = PersonalMessagePrefixBytes.concat(lengthBytes);
      return keccak256(prefix, message);
  }

  // check proof
  function checkProof(
    bytes32 root,
    bytes data,
    bytes proof,
    bool convertToMessageHash) view public returns (bool) {

    bytes32 h;
    if (convertToMessageHash) {
      h = createPersonalMessageTypeHash(data);
    } else {
      h = keccak256(data);
    }

    bytes32 elProvided;
    uint8 rightElementProvided;
    uint32 loc;
    uint32 elLoc;

    for (uint32 i = 32; i <= uint32(proof.length); i += 33) {
      assembly {
        loc  := proof
        elLoc := add(loc, add(i, 1))
        elProvided := mload(elLoc)
      }
      rightElementProvided = uint8(bytes1(0xff)&proof[i-32]);
      if (rightElementProvided > 0) {
        h = keccak256(h, elProvided);
      } else {
        h = keccak256(elProvided, h);
      }
    }
    return h == root;
  }

  // check proof
  function checkProofOnly(uint256 _bn, uint32 _txIdx, bytes _rawTx, bytes _proof) returns (bool _success) {

    // get header
    Header header = headers[_bn];

    bool validProof = checkProof(header.merkleRootHash, _rawTx, _proof, false);
    if ( validProof == false ) {
      return false;
    }
    return true;
  }
}
