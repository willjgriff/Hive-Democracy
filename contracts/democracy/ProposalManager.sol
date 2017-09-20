pragma solidity ^0.4.10;

import "./DelegationNetwork.sol";
import "./DelegationProxy.sol";
import "../token/MiniMeToken.sol";
import "../Controlled.sol";

/**
 * @title ProposalManager
 * @author Ricardo Guilherme Schmidt (Status Research & Development GmbH)
 * Store the proposals, votes and results for other smartcontracts  
 */
contract ProposalManager is Controlled {
 
    DelegationNetwork public network;
    MiniMeToken public token;

    Proposal[] proposals;
    
    function addProposal(bytes4 topic, address destination, uint value, bytes data) onlyController returns (uint) {
        uint pos = proposals.length++;
        Proposal storage p = proposals[pos];
        
        p.topic = topic;
        p.destination = destination;
        p.value = value;
        p.data = sha3(data);

        p.blockStart = block.number + 1000; //will be replaced by configurations
        p.voteBlockEnd = p.blockStart + 10000; //dummy value
        p.vetoBlockEnd = p.voteBlockEnd + 5000; //dummy value
        
        return pos;
    }

    struct Proposal {
        bytes4 topic; 

        address destination;
        uint value;
        bytes32 data;

        uint blockStart;
        uint voteBlockEnd;
        uint vetoBlockEnd;

        VoteTicket[] votes;
        mapping(address => uint) voteIndex;

        uint tabulationPosition;
        bool tabulated;
        mapping(uint8 => uint) results;
        
        bool approved;
        bool executed;
    }
        
    struct VoteTicket {
        address voter;
        Vote vote;
    }
    
    enum Vote { 
        Reject, 
        Approve,
        Veto  
    }
     
    function vote(uint _proposal, Vote _vote) {
        Proposal storage proposal = proposals[_proposal];
        require(block.number >= proposal.blockStart);
        if (_vote == Vote.Veto) {
            require(block.number <= proposal.vetoBlockEnd);
        } else {
            require(block.number <= proposal.voteBlockEnd);
        }
        uint votePos = proposal.voteIndex[msg.sender];
        if (votePos == 0) {
            votePos = proposal.votes.length;
        } else {
            votePos = votePos - 1;
        }
        VoteTicket storage ticket = proposal.votes[votePos];
        assert (ticket.voter == 0x0 || ticket.voter == msg.sender);
        ticket.voter = msg.sender;
        ticket.vote = _vote;
        proposal.voteIndex[msg.sender] = votePos + 1;
    }

   function tabulate(uint _proposal, uint loopLimit) {
        Proposal storage proposal = proposals[_proposal];
        require(block.number > proposal.vetoBlockEnd);
        require(!proposal.tabulated);
        
        uint totalVoted = proposal.votes.length;
        if (loopLimit == 0) {
            loopLimit = totalVoted;    
        }
        require (loopLimit <= totalVoted);
        require (loopLimit > proposal.tabulationPosition);
        
        DelegationProxy voteDelegation;
        DelegationProxy vetoDelegation;
        (voteDelegation, vetoDelegation) = network.getTopic(proposal.topic);
        
        for (uint i = proposal.tabulationPosition; i < loopLimit; i++) {
            VoteTicket memory _vote = proposal.votes[i];
            if (_vote.vote == Vote.Reject || _vote.vote == Vote.Approve) {
                proposal.results[uint8(_vote.vote)] += voteDelegation.influenceOfAt(_vote.voter, token, proposal.voteBlockEnd);
            } else {
                proposal.results[uint8(_vote.vote)] += vetoDelegation.influenceOfAt(_vote.voter, token, proposal.vetoBlockEnd);
            }
        }
        
        proposal.tabulationPosition = i;
        if (proposal.tabulationPosition == totalVoted) {
            proposal.tabulated = true;        
        }
   }

}