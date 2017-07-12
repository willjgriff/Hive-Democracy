import "./MiniMeToken.sol";
pragma solidity ^0.4.11;

/**
 * @title DelegativeDemocracy
 * @author Ricardo Guilherme Schmidt
 * Create a delegative democracy to MiniMeTokens; 
 */
contract DelegativeDemocracy {
    
    mapping (address => Delegation[]) public delegations;
    event Delegate(address who, address to);
    
    struct Delegation {
        uint128 fromBlock; //when this was updated
        address to; //who recieved the delegaton
        address[] from; //who is delegation
        uint256 toIndex; //index in from array of `to`
    }
    
    /**
     * @notice Reads delegation at a point in history
     * @param _who The address `_who` votes are being delegated to (full chain)
     * @param _block From what block
     * @return address delegated, 0x0 if not delegating
     */
    function delegationOfAt(address _who, uint _block)
     constant returns(address) {
        Delegation memory delegation =  getDelegationAt(delegations[_who], _block);
        if(delegation.to != 0x0) //A_who is delegating?
            return delegationOfAt(delegation.to, _block); //load the delegation of _who delegation
        else
            return _who; //reached the endpoint of delegation

    }  
    
    /**
     * @notice Reads the sum of votes a address have at a point in history
     * @param _who From what address
     * @param _token address of MiniMeToken
     * @param _block From what block
     * @return amount of votes
     */
    function influenceOfAt(address _who, MiniMeToken _token, uint _block)
     constant returns(uint256) {
        if(delegationOfAt(_who, _block) == 0x0) //is endpoint of delegation?
            return _votesDelegatedTo(_who, _token, _block); //calcule the votes delegated to _who
        else return 0; //no votes: were delegated
    }   

    /** 
     * @notice changes the delegation of an account, if _to 0x00: self delegation (become voter)
     * @param _to to what address the caller address will delegate to?
     */
    function delegate(address _to) {
        address _from = msg.sender;
        require(delegationOfAt(_to, block.number) != _from); //block impossible circular delegation
        Delegate(_from,_to);
        
        Delegation memory _newFrom; 
        Delegation[] storage fromHistory = delegations[_from];
        if (fromHistory.length > 0) {
            _newFrom = fromHistory[fromHistory.length - 1];
            if(_newFrom.to != 0x0){ //was delegating? remove old link
                _removeDelegated(_newFrom.to, _newFrom.toIndex);
            }
        }
        //Add the new delegation
        _newFrom.fromBlock = uint128(block.number);
        _newFrom.to = _to;//register where our delegation is going

        if(_to != 0x0) { //_to is an account?
            _newFrom.toIndex = _addDelegated(_from,_to);
        } else {
            _newFrom.toIndex = 0; //zero index
        }
        fromHistory.push(_newFrom);//reguster `from` delegation update;
    }
    
    /**
     * @dev sum the balance of _who and his from list.
     */
    function _votesDelegatedTo(address _who, MiniMeToken _token, uint _block)
     internal
     constant returns(uint256 _total) {
        _total = _token.balanceOfAt(_who, _block); // source of _who votes
        address[] memory _from = getDelegationAt(delegations[_who],_block).from;
        uint _len = _from.length;
        for(uint256 i = 0; _len > i; i++)  
            _total += _votesDelegatedTo(_from[i], _token, _block); //sum the from delegation votes
    }

    
    /// @dev `getDelegationAt` retrieves the delegation at a given block number
    /// @param checkpoints The history of values being queried
    /// @param _block The block number to retrieve the value at
    /// @return The delegation being queried
    function getDelegationAt(Delegation[] storage checkpoints, uint _block
    ) constant internal returns (Delegation d) {
        if (checkpoints.length == 0) return;

        // Shortcut for the actual value
        if (_block >= checkpoints[checkpoints.length-1].fromBlock)
            return checkpoints[checkpoints.length-1];
        if (_block < checkpoints[0].fromBlock) return;

        // Binary search of the value in the array
        uint min = 0;
        uint max = checkpoints.length-1;
        while (max > min) {
            uint mid = (max + min + 1)/ 2;
            if (checkpoints[mid].fromBlock<=_block) {
                min = mid;
            } else {
                max = mid-1;
            }
        }
        return checkpoints[min];
    }
    
    /**
     * @dev removes address from list.
     */
    function _removeDelegated(address _to, uint _toIndex) private {
        Delegation[] storage oldTo = delegations[_to];
        uint _oldToLen = oldTo.length;
        require(_oldToLen > 0);
        Delegation memory _newOldTo = oldTo[_oldToLen - 1]; 
        _newOldTo.from[_toIndex] = _newOldTo.from[_newOldTo.from.length - 1];
        oldTo.push(_newOldTo);
        oldTo[_oldToLen].from.length--;
    }

    /**
     * @dev add address to listt.
     */
    function _addDelegated(address _from, address _to) private returns (uint _toIndex) {
        Delegation memory _newTo;
        Delegation[] storage toHistory = delegations[_to];
        uint toHistLen = toHistory.length;
        if (toHistLen > 0) {
            _newTo = toHistory[toHistLen - 1];
        }
        _newTo.fromBlock = uint128(block.number);
        _toIndex = _newTo.from.length; //link to index
        toHistory.push(_newTo); //register `to` delegated from
        toHistory[toHistLen].from.push(_from);
    }
}