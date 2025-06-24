// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PayPerView {
    struct Video {
        address uploader;
        string videoHash;
        string thumbnailHash;
        uint256 price;
        uint256 displayTime; // in seconds
    }

    Video[] public videos;

    // videoId => user => unlock timestamp
    mapping(uint256 => mapping(address => uint256)) public viewUnlockTime;

    event VideoUploaded(
        uint256 indexed videoId,
        address indexed uploader,
        string videoHash,
        string thumbnailHash,
        uint256 price,
        uint256 displayTime
    );
    event PaidToView(
        uint256 indexed videoId,
        address indexed viewer,
        uint256 unlockTime
    );

    function uploadVideo(
        string memory _videoHash,
        string memory _thumbnailHash,
        uint256 _price,
        uint256 _displayTime
    ) external {
        videos.push(Video({
            uploader: msg.sender,
            videoHash: _videoHash,
            thumbnailHash: _thumbnailHash,
            price: _price,
            displayTime: _displayTime
        }));
        emit VideoUploaded(videos.length - 1, msg.sender, _videoHash, _thumbnailHash, _price, _displayTime);
    }

    function payToView(uint256 videoId) external payable {
        require(videoId < videos.length, "Invalid videoId");
        Video storage vid = videos[videoId];
        require(msg.value >= vid.price, "Insufficient payment");

        // Set unlock time for the viewer
        viewUnlockTime[videoId][msg.sender] = block.timestamp + vid.displayTime;

        // Transfer payment to uploader
        payable(vid.uploader).transfer(msg.value);

        emit PaidToView(videoId, msg.sender, viewUnlockTime[videoId][msg.sender]);
    }

    function canView(uint256 videoId, address user) external view returns (bool) {
        return viewUnlockTime[videoId][user] > block.timestamp;
    }

    function getVideos()
        external
        view
        returns (
            address[] memory uploaders,
            string[] memory videoHashes,
            string[] memory thumbnailHashes,
            uint256[] memory prices,
            uint256[] memory displayTimes
        )
    {
        uint256 len = videos.length;
        uploaders = new address[](len);
        videoHashes = new string[](len);
        thumbnailHashes = new string[](len);
        prices = new uint256[](len);
        displayTimes = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            Video storage v = videos[i];
            uploaders[i] = v.uploader;
            videoHashes[i] = v.videoHash;
            thumbnailHashes[i] = v.thumbnailHash;
            prices[i] = v.price;
            displayTimes[i] = v.displayTime;
        }
    }
}