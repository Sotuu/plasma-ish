## Plasma-ish
This is an example implementation of side chain inspired by the technique called plasma. You can find more detail on my [blog](https://medium.com/@kouohhashi).

## Features
1. get transactions from child net and generate merkle root hash and submit the data to parent net
2. check proof on parent net

## How to try
In production environment, parent net is supposed to be the Ethereum main net and child net is supposed to be a private net. But for experiment, you can use any Ethereum network to any roll.  
For example, the Ropsten testnet for childnet and a private net for parentnet. It's convenient because there are already enough transactions in the Ropsten testnet.

### Install
```
git clone https://github.com/Sotuu/plasma-ish.git
cd plasma-ish
npm install
```

### deploy 2 contracts.
deploy PlasmaParent_submitonly contract on parent net
deploy PlasmaChild_submitonly contract on child net

### create settings.js
```
cp settings_example.js settings.js
```

### submit merkle root hash
test_submit command get tranasctions from child net to create merkle root hash and sumbit it.  
```
npm run test_submit
```

### check proof
You can put raw transaction and plasma block number which you can see on console.log of test_submit in settings.js  
```
npm run test_proof
```


## Todos
1. Transferring ERC20 between parent and child network.
2. Experiment for grand child network


## License  
MIT. You can do whatever you want.  
