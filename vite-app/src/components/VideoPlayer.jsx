import Plyr from 'plyr-react';
import 'plyr-react/plyr.css';

const VideoPlayer = ({ ipfsHash }) => {
  if (!ipfsHash) return null;
  const src = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Plyr
        source={{
          type: 'video',
          sources: [
            {
              src,
              provider: 'html5',
            },
          ],
        }}
        options={{ controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'] }}
      />
    </div>
  );
};

export default VideoPlayer; 