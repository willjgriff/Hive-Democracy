pragma solidity ^0.4.10;

import "./Queen.sol";
import "./Hive.sol";
import "../democracy/DelegationNetwork.sol";
import "../democracy/ProposalManager.sol";
import "../token/MiniMeToken.sol";

contract Constitution {
    
    event NewConstitution(address constitution);
    Hive public hive;
    address public constitution;

    modifier onlyQueen {
        require(msg.sender == address(this));
        _;
    }

    modifier onlyHive {
        require(msg.sender == address(hive));
        _;
    }

    MiniMeToken token;
    DelegationNetwork delegations;
    ProposalManager proposals;
    
    
    function install() {
        if (address(delegations) == 0x0) {
            delegations = new DelegationNetwork();
            token = hive.honey();
            proposals = new ProposalManager();
        }
    }
    
    function update() onlyQueen returns (bool) {
        return false;
    }

    function newProposal(address destination, uint value, bytes data) onlyHive returns(uint) {
        return proposals.addProposal(0x0, destination, value, data);
    }

}