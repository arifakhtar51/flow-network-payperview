import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseEther } from 'ethers';
import { toast } from 'react-toastify';
import axios from 'axios';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contract';

const PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5OTMyNjE0OC1hMzIzLTQ0YzItYjUwNi00MTU0YTNiMTNmMzMiLCJlbWFpbCI6ImFyaWZha2h0YXI5MDJAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjMzZGRkZjg0YjEyOTQxMjI3ZWI3Iiwic2NvcGVkS2V5U2VjcmV0IjoiNDBiNDQ2ZTJkYWNjM2Y3MzQ5OTI4ODgxZTc1NmVlYzg4OGE3YmYxNjEyYWRlYzRkODE2MmYxY2NjNTI5ZWZhNCIsImV4cCI6MTc4MTg4NDY5MX0.Z0T0LvsNHTyV7YLBmiuzb79xI3uUaIm2L8YQDZ2cKBc';
const FLOW_CHAIN_ID = '0x221';

const Upload = () => {
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [price, setPrice] = useState('');
  const [displayTime, setDisplayTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [chainOk, setChainOk] = useState(true);
  const [account, setAccount] = useState(null);

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
    }
  };

  const uploadToPinata = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        maxBodyLength: 'Infinity',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      });
      return res.data.IpfsHash;
    } catch (err) {
      throw new Error(
        err?.response?.data?.error?.details ||
        err?.response?.data?.error ||
        err?.message ||
        'Unknown Pinata error'
      );
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile || !thumbnailFile || !price || !displayTime) {
      toast.error('Fill all fields');
      return;
    }
    if (!window.ethereum) {
      toast.error('MetaMask is not installed or not detected!');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [videoHash, thumbnailHash] = await Promise.all([
        uploadToPinata(videoFile),
        uploadToPinata(thumbnailFile),
      ]);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.uploadVideo(
        videoHash,
        thumbnailHash,
        parseEther(price),
        displayTime
      );
      await tx.wait();
      toast.success('Video uploaded!');
      setVideoFile(null);
      setThumbnailFile(null);
      setPrice('');
      setDisplayTime('');
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    }
    setLoading(false);
  };

  if (!chainOk) {
    return (
      <div style={{ padding: 24, color: '#ff9800', fontWeight: 'bold' }}>
        Please switch to the Flow EVM Testnet to upload videos.
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Upload Video</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
        <label>
          Video File
          <input type="file" accept="video/*" onChange={e => setVideoFile(e.target.files[0])} />
        </label>
        <label>
          Thumbnail Image
          <input type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files[0])} />
        </label>
        <label>
          Flow Price
          <input type="number" step="0.0001" min="0" value={price} onChange={e => setPrice(e.target.value)} />
        </label>
        <label>
          Valid View Time (seconds)
          <input type="number" min="1" value={displayTime} onChange={e => setDisplayTime(e.target.value)} />
        </label>
        <button
          type="submit"
          disabled={loading || !account}
          title={!account ? 'Connect your wallet to upload' : ''}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
    </div>
  );
};

export default Upload; 