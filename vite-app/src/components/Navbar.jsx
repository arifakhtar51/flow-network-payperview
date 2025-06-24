import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const FLOW_CHAIN_ID = '0x221';
const FLOW_PARAMS = {
  chainId: FLOW_CHAIN_ID,
  chainName: 'Flow EVM Testnet',
  nativeCurrency: { name: 'Flow', symbol: 'FLOW', decimals: 18 },
  rpcUrls: ['https://evm.testnet.flowchain.dev'],
  blockExplorerUrls: ['https://testnet.flowscan.org/'],
};

const Navbar = () => {
  const [account, setAccount] = useState(null);
  const [chainOk, setChainOk] = useState(false);

  useEffect(() => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      setAccount(window.ethereum.selectedAddress);
    }
    window.ethereum?.on('accountsChanged', (accounts) => {
      setAccount(accounts[0] || null);
    });
    window.ethereum?.on('chainChanged', checkChain);
    checkChain();
    return () => {
      window.ethereum?.removeAllListeners('accountsChanged');
      window.ethereum?.removeAllListeners('chainChanged');
    };
  }, []);

  const checkChain = async () => {
    if (window.ethereum) {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainOk(chainId === FLOW_CHAIN_ID);
      if (chainId !== FLOW_CHAIN_ID) {
        toast.error('Please switch to Flow EVM Testnet to use the app!');
      }
    }
  };

  const switchToFlow = async () => {
    if (!window.ethereum) return toast.error('MetaMask not detected');
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: FLOW_CHAIN_ID }],
      });
    } catch (switchError) {
      // If the chain is not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [FLOW_PARAMS],
          });
        } catch (addError) {
          toast.error('Failed to add Flow EVM Testnet');
        }
      } else {
        toast.error('Failed to switch network');
      }
    }
    checkChain();
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      checkChain();
    } else {
      toast.error('MetaMask not detected');
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottom: '1px solid #eee', background: '#fff', color: '#222' }}>
      <div>
        <Link to="/" style={{ marginRight: 16, fontWeight: 'bold', fontSize: 20, pointerEvents: chainOk ? 'auto' : 'none', color: chainOk ? '#222' : '#aaa' }}>PayPerView</Link>
        <Link to="/upload" style={{ marginRight: 16, pointerEvents: chainOk ? 'auto' : 'none', color: chainOk ? '#222' : '#aaa' }}>Upload</Link>
      </div>
      <div>
        {!chainOk && (
          <button onClick={switchToFlow} style={{ marginRight: 12, background: '#ff9800', color: '#222' }}>Switch to Flow EVM Testnet</button>
        )}
        {account ? (
          <>
            <span style={{ marginRight: 12, color: '#222' }}>Connected: {account.slice(0, 6)}...{account.slice(-4)}</span>
            <button onClick={disconnectWallet}>Disconnect</button>
          </>
        ) : (
          <button onClick={connectWallet}>Connect MetaMask</button>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 