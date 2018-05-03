//
// Sotuu Transaction Tracker
//

import Web3 from 'web3'
import ethUtil from 'ethereumjs-util'
const EthereumTx = require('ethereumjs-tx')
const MerkleTools = require('./merkle-tools');
const BN = ethUtil.BN
const keythereum = require("keythereum");

import {
  CHILD_API_URL,
  PARRNT_API_URL,
  PLASMA_CHILD_ADDRESS,
  PLASMA_PARENT_ADDRESS,
  ORACLE_ADDRESS,
  ORACLE_DATADIR,
  ORACLE_PASSWORD,
  TX_COUNT_IN_PLASMA_BLOK,
  BN_PROOF_TEST,
  RAW_TX_FOR_PROOF_TEST,
} from './settings'

// child network
const childWeb3 = new Web3(new Web3.providers.HttpProvider(CHILD_API_URL));

// parent network
const parentWeb3 = new Web3(new Web3.providers.HttpProvider(PARRNT_API_URL));

// ABI
import PLASMA_CHILD_JSON from './PlasmaChild_submitonly.json'
import PLASMA_PARENT_JSON from './PlasmaParent_submitonly.json'

// private key of oracle address
let ORACLE_KEY

// submit plasma header to parent net
const plasma_submit_header1 = async (req, res) => {

  try {

    // get private key
    ORACLE_KEY = await get_private_key({
      datadir: ORACLE_DATADIR,
      address: ORACLE_ADDRESS,
      password: ORACLE_PASSWORD,
    })
    console.log("get_private_key success")

    // init child plasma contract instance
    const plasma_child_instance = await new childWeb3.eth.Contract(PLASMA_CHILD_JSON.abi, PLASMA_CHILD_ADDRESS)
    const plasma_parent_instance = await new childWeb3.eth.Contract(PLASMA_PARENT_JSON.abi, PLASMA_PARENT_ADDRESS)

    // is it processing now?
    const processing = await get_plasma_processing({
      instance: plasma_child_instance,
    })
    if (processing === true) {
      throw new Error('Still processing!');
    }
    console.log("get_plasma_processing success")

    // set processing true
    await set_processing_true({
      instance: plasma_child_instance,
    })
    console.log("set_processing_true success")

    // // just check
    // const ownerAddress = await plasma_child_instance.methods.ownerAddress().call({
    //   from: ORACLE_ADDRESS,
    // })
    // console.log("ownerAddress: ", ownerAddress)

    // get current plasma block number
    const current_plasma_bn = await get_current_plasma_blocknum({
      instance: plasma_child_instance,
    })
    console.log("get_current_plasma_blocknum: ", current_plasma_bn)

    // get last plasma block header which include last plasma block header and other paratemers
    const parent_plasma_bn = current_plasma_bn - 1
    const parent_plasma_header = await get_plasma_header({
      instance: plasma_child_instance,
      plasma_bn: parent_plasma_bn,
    })
    console.log("get_plasma_header: ", parent_plasma_header)

    // get max block number which is alrady included
    let max_childnet_bn_included = await get_max_childnet_bn_included({
      instance: plasma_child_instance,
    })
    // // debug
    // if ( current_plasma_bn === 1 ) {
    //   max_childnet_bn_included = max_childnet_bn_included + 300000
    // }
    console.log("get_max_childnet_bn_included: ", max_childnet_bn_included)

    // get latest block_number
    const childnet_latest_block_number = await get_childnet_latest_block_number()
    console.log("get_childnet_latest_block_number:", childnet_latest_block_number)

    // get 100 transactions or latest block
    const merkleHash_info = await create_merkle_hash_and_txcount({
      max_childnet_bn_included: parseInt(max_childnet_bn_included),
      // target_count: 100,
      target_count: TX_COUNT_IN_PLASMA_BLOK,
      childnet_latest_block_number: parseInt(childnet_latest_block_number),
    })
    console.log("merkleHash_info: ", merkleHash_info)

    // get parent hash
    const parentHashx = get_parentHash({
      parent_plasma_header: parent_plasma_header,
    })
    console.log("parentHashx: ", parentHashx)

    // create submit data
    const hexData_info =  await generate_data_to_submit_plasma_header({
      current_plasma_bn: current_plasma_bn,
      tx_count_in_merkle: merkleHash_info.tx_count_in_merkle,
      merkleHashx: merkleHash_info.merkleHashx,
      parentHashx: parentHashx,
    })
    console.log("hexData: ", hexData_info.hexData)
    console.log("block_sig: ", hexData_info.block_sig)

    // submit header to parent
    const result1 = await submit_plasma_header_to_parent({
      hexData: hexData_info.hexData,
      instance: plasma_parent_instance,
    })
    console.log("submit_plasma_header_to_parent: done: ", result1)

    let transactionHash
    if (result1 && result1.events && result1.events.HeaderSubmittedEvent) {
      console.log("HeaderSubmittedEvent: ", result1.events.HeaderSubmittedEvent)
      transactionHash = result1.events.HeaderSubmittedEvent.transactionHash
    }

    // throw error if parent net return error
    if (!transactionHash) {
      throw new Error('No transactionHash!');
    }

    // update header on childnet
    await complete_plasma_child({
      instance: plasma_child_instance,
      current_plasma_bn: current_plasma_bn,
      tx_count_in_merkle: merkleHash_info.tx_count_in_merkle,
      merkleHashx: merkleHash_info.merkleHashx,
      block_sig: hexData_info.block_sig,
      max_bn_will_include: merkleHash_info.max_bn_will_include,
      parentHashx: parentHashx,
      transactionHash: transactionHash,
    })

    console.log("tx_tkr_plasma_submit_header success")
  } catch (err) {
    console.log("tx_tkr_plasma_submit_header error:", err)
  }
}

//
// convenient functions
//

// set processing true on plasma child contract
const set_processing_true = async ({ instance }) => {

  const estimateGas = await instance.methods.setProcessing(true).estimateGas({
    from: ORACLE_ADDRESS,
  })

  const results = await instance.methods.setProcessing(true).send({
    from: ORACLE_ADDRESS,
    gas: estimateGas,
  })
}

// get value of processing on plasma child
const get_plasma_processing = async ({ instance }) => {

  const processing = await instance.methods.processing().call({
    from: ORACLE_ADDRESS,
  })

  return processing
}

// get current plasma block number on plasma child contract
const get_current_plasma_blocknum = async ({ instance }) => {

  const current_plasma_bn = await instance.methods.current_plasma_bn().call({
    from: ORACLE_ADDRESS,
  })

  return parseInt(current_plasma_bn)
}

// get plasma header information on child contract
const get_plasma_header = async ({ instance, plasma_bn }) => {

  const plsma_header = await instance.methods.plasmaBlockHeaders(plasma_bn).call({
    from: ORACLE_ADDRESS,
  })

  return plsma_header
}

// get max blockchain block number of child net
const get_max_childnet_bn_included = async ({ instance }) => {
  const max_childnet_bn_included = await instance.methods.max_childnet_bn_included().call({
    from: ORACLE_ADDRESS,
  })

  return parseInt(max_childnet_bn_included)
}

// get latest blockchain block number of child net
const get_childnet_latest_block_number = async () => {
  const blockNumber = await childWeb3.eth.getBlockNumber()
  return parseInt(blockNumber)
}

// create merkle root hash
const create_merkle_hash_and_txcount = async ({
  max_childnet_bn_included,
  target_count,
  childnet_latest_block_number,
}) => {

  // init merkleTree
  const treeOptions = {
  hashType: 'sha3'
  }
  const merkleTree = new MerkleTools(treeOptions)

  // init transaction count
  let tx_count_in_merkle = 0

  let idx = max_childnet_bn_included + 1

  let loop_flg = true
  while (loop_flg) {
    let tx_count = await parentWeb3.eth.getBlockTransactionCount(idx)
    if (tx_count !== 0) {

      for (var j=0; j<tx_count; j++){
        let tx = await parentWeb3.eth.getTransactionFromBlock(idx, j)

        // create tx object
        const tx2 = new EthereumTx(tx);
        // get serialized transaction
        const serializedTx = tx2.serialize();
        // rawTx
        const rawTx = "0x"+serializedTx.toString('hex')

        // // debug
        // console.log("")
        // console.log("rawTx: ", rawTx)
        // console.log("")

        // get sha256 of rawTx
        const leaf = ethUtil.sha3(rawTx, 256).toString("hex")
        merkleTree.addLeaf(leaf);
        tx_count_in_merkle = tx_count_in_merkle + 1
      }
    }

    if (childnet_latest_block_number === idx) {
      // reach latest block number
      loop_flg = false
    } else if (tx_count_in_merkle > target_count) {
      // find enough transactions
      loop_flg = false
    } else {
      // keep loop
      idx = idx + 1
    }
  }

  // create merkle tree
  merkleTree.makeTree(false);

  // get root hash
  const merkleHashx =  merkleTree.getMerkleRoot()
  const rtn_object = {
    merkleHashx: merkleHashx,
    tx_count_in_merkle: tx_count_in_merkle,
    max_bn_will_include: idx,
  }
  return rtn_object
}

// get parent hash
const get_parentHash = ({ parent_plasma_header }) => {

  const header = parent_plasma_header

  let parentHashx

  if ( parseInt(header.blockNumber) === 0) {
    parentHashx = ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(0)), 32);
  } else {
    const arr = [
      ethUtil.toBuffer("\x19Ethereum Signed Message:\n"),
      ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(137)), 32),
      ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(header.blockNumber)), 4),
      ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(header.numTransactions)), 4),
      ethUtil.setLengthLeft(ethUtil.toBuffer(header.previousBlockHash), 32),
      ethUtil.setLengthLeft(ethUtil.toBuffer(header.merkleRootHash), 32),
      ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(header.v)), 1),
      ethUtil.setLengthLeft(ethUtil.toBuffer(header.r), 32),
      ethUtil.setLengthLeft(ethUtil.toBuffer(header.s), 32),
    ]
    const parentHash = childWeb3.utils.sha3(Buffer.concat(arr))
    parentHashx = new Buffer(parentHash.substr(2), 'hex');
  }

  return parentHashx
}

// generate hex data to submit to parent net
const generate_data_to_submit_plasma_header = ({
  current_plasma_bn,
  tx_count_in_merkle,
  merkleHashx,
  parentHashx
}) => {

  const arr = [
    ethUtil.toBuffer("\x19Ethereum Signed Message:\n"),
    ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(72)), 32),
    ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(current_plasma_bn)), 4),
    ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(tx_count_in_merkle)), 4),
    parentHashx,
    merkleHashx,
  ]

  // create message hash
  const messageHash = childWeb3.utils.sha3(Buffer.concat(arr))
  const msgHashx = new Buffer(messageHash.substr(2), 'hex');

  // sign it
  const privateKeyx = ethUtil.toBuffer("0x"+ORACLE_KEY)
  const block_sig = ethUtil.ecsign(msgHashx, privateKeyx)

  // this is for next
  let arr2 = [
    ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(current_plasma_bn)), 4),
    ethUtil.setLengthLeft(ethUtil.toBuffer(new BN(tx_count_in_merkle)), 4),
    parentHashx,
    merkleHashx,
    ethUtil.setLengthLeft(ethUtil.toBuffer(block_sig.v), 1),
    ethUtil.setLengthLeft(ethUtil.toBuffer(block_sig.r), 32),
    ethUtil.setLengthLeft(ethUtil.toBuffer(block_sig.s), 32)
  ]
  const hexData = ethUtil.addHexPrefix(Buffer.concat(arr2).toString('hex'));

  return {
    hexData: hexData,
    block_sig: block_sig
  };
}

// submit hex data to parent
const submit_plasma_header_to_parent = async ({ hexData, instance }) => {

  const estimateGas = await instance.methods.submitBlock3(hexData).estimateGas({
    from: ORACLE_ADDRESS,
  })

  const results = await instance.methods.submitBlock3(hexData).send({
    from: ORACLE_ADDRESS,
    gas: estimateGas,
  })

  return results
}

// update status of plasma child contract
const complete_plasma_child = async ({
  instance,
  current_plasma_bn,
  tx_count_in_merkle,
  merkleHashx,
  block_sig,
  max_bn_will_include,
  parentHashx,
  transactionHash,
}) => {

  const merkleHash = "0x"+merkleHashx.toString("hex")
  const parentHash = "0x"+parentHashx.toString("hex")
  const sig_v = block_sig.v
  const sig_r = "0x"+block_sig.r.toString("hex")
  const sig_s = "0x"+block_sig.s.toString("hex")

  // // debug
  // console.log("---------------")
  // console.log(current_plasma_bn)
  // console.log(tx_count_in_merkle)
  // console.log(parentHash)
  // console.log(merkleHash)
  // console.log(sig_v)
  // console.log(sig_r)
  // console.log(sig_s)
  // console.log("---------------")

  const estimateGas = await instance.methods.completePlasmaBlockHeader(
    current_plasma_bn,
    tx_count_in_merkle,
    parentHash,
    merkleHash,
    sig_v,
    sig_r,
    sig_s,
    transactionHash,
    max_bn_will_include,
  ).estimateGas({
    from: ORACLE_ADDRESS,
  })

  const results = await instance.methods.completePlasmaBlockHeader(
    current_plasma_bn,
    tx_count_in_merkle,
    parentHash,
    merkleHash,
    sig_v,
    sig_r,
    sig_s,
    transactionHash,
    max_bn_will_include,
  ).send({
    from: ORACLE_ADDRESS,
    gas: estimateGas,
  })
  return results
}

// test proof
const test_proof = async () => {

  try {
    // init merkleTree
    const treeOptions = {
    hashType: 'sha3'
    }
    const merkleTree = new MerkleTools(treeOptions)

    const plasma_bn = BN_PROOF_TEST
    const rawTx_to_prove = RAW_TX_FOR_PROOF_TEST

    // prepare contract instance
    const plasma_child_instance = await new childWeb3.eth.Contract(PLASMA_CHILD_JSON.abi, PLASMA_CHILD_ADDRESS)
    const plasma_parent_instance = await new childWeb3.eth.Contract(PLASMA_PARENT_JSON.abi, PLASMA_PARENT_ADDRESS)

    // get block from block number
    const parent_plasma_header = await get_plasma_header({
      instance: plasma_child_instance,
      plasma_bn: plasma_bn,
    })
    console.log("parent_plasma_header: ", parent_plasma_header)

    // create merkle tree
    const s_idx = parseInt(parent_plasma_header.start_childnet_bn)
    const e_idx = parseInt(parent_plasma_header.end_childnet_bn) + 1;
    console.log("s_idx:",s_idx, ", e_idx: ", e_idx)

    let index_in_merkle_tree = 0
    let idx_of_rawTx_in_merkle = -1

    for (var idx=s_idx; idx<e_idx; idx++){

      const tx_count = await parentWeb3.eth.getBlockTransactionCount(idx)

      if (tx_count !== 0) {

        for (var j=0; j<tx_count; j++){
          const tx = await parentWeb3.eth.getTransactionFromBlock(idx, j)

          // create tx object
          const tx2 = new EthereumTx(tx);
          // get serialized transaction
          const serializedTx = tx2.serialize();
          // rawTx
          const rawTx = "0x"+serializedTx.toString('hex')

          // // debug
          // console.log("")
          // console.log("rawTx: ", rawTx)
          // console.log("")
          if (rawTx_to_prove === rawTx) {
            idx_of_rawTx_in_merkle = index_in_merkle_tree
          }

          // get sha256 of rawTx
          const leaf = ethUtil.sha3(rawTx, 256).toString("hex")
          merkleTree.addLeaf(leaf);

          index_in_merkle_tree = index_in_merkle_tree + 1
        }
      }
    }

    // if we can not find raw tx, then throw
    if (idx_of_rawTx_in_merkle == -1) {
      throw new Error('transactin not found in the block number!');
    }

    // create merkle tree
    merkleTree.makeTree(false);

    // generate proof
    const proof = ethUtil.bufferToHex(Buffer.concat(merkleTree.getProof(idx_of_rawTx_in_merkle, true)));

    // call checkProofOnly method
    const results = await plasma_parent_instance.methods.checkProofOnly(
      plasma_bn,
      idx_of_rawTx_in_merkle,
      rawTx_to_prove,
      proof
    ).call({
      from: ORACLE_ADDRESS,
    })
    console.log("results: ", results)

  } catch (err) {
    console.log("err: ", err)
  }
}

// retrieve private key
const get_private_key = async ({ datadir, address, password }) => {
  var keyObject = keythereum.importFromFile(address, datadir);
  var privateKeyx = keythereum.recover(password, keyObject);
  return privateKeyx.toString('hex')
}

// run script
const command_name = process.argv[2]
if (command_name === "plasma_submit_header1") {
  plasma_submit_header1()
} else if (command_name === "test_proof") {
  test_proof()
} else {
  console.log("no such command: ", command_name)
}
