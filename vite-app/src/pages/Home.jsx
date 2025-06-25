import { useEffect, useState } from 'react';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import { toast } from 'react-toastify';
import VideoPlayer from '../components/VideoPlayer';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../utils/contract';

const FLOW_CHAIN_ID = '0x221';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [canView, setCanView] = useState(false);
  const [viewTimeLeft, setViewTimeLeft] = useState(0);
  const [account, setAccount] = useState(null);
  const [chainOk, setChainOk] = useState(true);

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

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const [uploaders, videoHashes, thumbnailHashes, prices, times] = await contract.getVideos();
      const vids = uploaders.map((u, i) => ({
        uploader: u,
        videoHash: videoHashes[i],
        thumbnailHash: thumbnailHashes[i],
        price: prices[i],
        displayTime: times[i],
        id: i,
      }));
      setVideos(vids);
    } catch (err) {
      toast.error('Failed to fetch videos');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handlePayToView = async (video) => {
    if (!account) return toast.error('Connect wallet first');
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.payToView(video.id, { value: video.price });
      await tx.wait();
      toast.success('Payment successful!');
      setSelectedVideo(video);
      checkCanView(video);
    } catch (err) {
      toast.error('Payment failed');
    }
  };

  const checkCanView = async (video) => {
    if (!account) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const allowed = await contract.canView(video.id, account);
      setCanView(allowed);
      // Countdown timer logic may need to be updated for v6 if you use contract storage access
    } catch (err) {
      setCanView(false);
    }
  };

  useEffect(() => {
    if (selectedVideo) checkCanView(selectedVideo);
    // eslint-disable-next-line
  }, [selectedVideo, account]);

  useEffect(() => {
    if (!canView || !viewTimeLeft) return;
    const interval = setInterval(() => {
      setViewTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [canView, viewTimeLeft]);

  if (!chainOk) {
    return (
      <div style={{ padding: 24, color: '#ff9800', fontWeight: 'bold' }}>
        Please switch to the Flow EVM Testnet to use the app.
      </div>
    );
  }

  if (loading) return <div>Loading videos...</div>;
  return (
    <div style={{ padding: 24 }}>
      <h2>Available Videos</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {videos.map((video) => (
          <div key={video.id} style={{
            border: '1px solid #eee',
            borderRadius: 12,
            padding: 0,
            width: 240,
            height: 340,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#111',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}>
            <div style={{
              flex: '0 0 180px',
              width: '100%',
              height: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#222',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              overflow: 'hidden',
            }}>
              <img src={`https://gateway.pinata.cloud/ipfs/${video.thumbnailHash}`} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 16 }}>
              <div style={{ marginBottom: 4 }}>Price: {formatEther(video.price)} Flow</div>
              <div style={{ marginBottom: 12 }}>Valid View Time: {video.displayTime} sec</div>
              <button
                onClick={() => { if (account) { setSelectedVideo(video); checkCanView(video); } }}
                style={{ marginTop: 'auto' }}
                disabled={!account}
                title={!account ? 'Connect your wallet to pay and view' : ''}
              >
                Pay to View
              </button>
            </div>
          </div>
        ))}
      </div>
      {selectedVideo && (
        <div style={{ marginTop: 32 }}>
          <h3>Selected Video</h3>
          {canView ? (
            <>
              <VideoPlayer ipfsHash={selectedVideo.videoHash} />
              {/* <div>Time left: {viewTimeLeft} sec</div> */}
            </>
          ) : (
            <button
              onClick={() => account && handlePayToView(selectedVideo)}
              disabled={!account}
              title={!account ? 'Connect your wallet to pay and view' : ''}
            >
              Pay to View
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default Home; 