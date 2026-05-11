// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReceiptAnchor {
    struct Batch {
        bytes32 merkleRoot;
        uint256 receiptCount;
        uint256 anchoredAt;
    }

    mapping(bytes32 => Batch) private _batches;

    event BatchAnchored(
        bytes32 indexed batchId,
        bytes32 merkleRoot,
        uint256 receiptCount,
        uint256 anchoredAt
    );

    function anchorBatch(
        bytes32 batchId,
        bytes32 merkleRoot,
        uint256 receiptCount
    ) external {
        require(_batches[batchId].anchoredAt == 0, "batch already anchored");
        _batches[batchId] = Batch({
            merkleRoot: merkleRoot,
            receiptCount: receiptCount,
            anchoredAt: block.timestamp
        });
        emit BatchAnchored(batchId, merkleRoot, receiptCount, block.timestamp);
    }

    function getBatchRoot(bytes32 batchId) external view returns (bytes32) {
        return _batches[batchId].merkleRoot;
    }
}
